import os
import re
import shutil
import zipfile
import requests
import git
from typing import List, Dict, Optional, Set, Tuple

from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

load_dotenv()

# ================= STATE ================= #

sessions = {}
memory = {}

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

ALLOWED_EXTS = (".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".md", ".html", ".css")
IGNORE_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", "venv", ".next", ".idea", ".vscode"}

IGNORE_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "composer.lock",
    "bundle.js", "main.js.map", "tsconfig.json"
}

MAX_CONTEXT = 6000

# ================= REPO DOWNLOAD / CLONE HELPER ================= #

def ensure_repo_exists(repo_name: str, github_token: Optional[str] = None) -> Tuple[bool, str]:
    """
    Ensures that the requested GitHub repository exists locally in ./temp_repos/.
    If missing, automatically clones or downloads it.
    """
    repo_folder = repo_name.replace("/", "_")
    repo_path = os.path.abspath(f"./temp_repos/{repo_folder}")

    if os.path.exists(repo_path) and os.listdir(repo_path):
        return True, repo_path

    os.makedirs("./temp_repos", exist_ok=True)

    # 1. Try Git Clone via GitPython
    try:
        if github_token:
            repo_url = f"https://x-access-token:{github_token}@github.com/{repo_name}.git"
        else:
            repo_url = f"https://github.com/{repo_name}.git"

        git.Repo.clone_from(repo_url, repo_path)
        return True, repo_path
    except Exception as e:
        # Clean up partial directory if git clone failed
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path, ignore_errors=True)

    # 2. Fallback: Download Repo as ZIP archive via GitHub API
    try:
        headers = {}
        if github_token:
            headers["Authorization"] = f"token {github_token}"

        zip_url = f"https://api.github.com/repos/{repo_name}/zipball"
        response = requests.get(zip_url, headers=headers, stream=True, timeout=30)

        if response.status_code == 200:
            zip_file_path = f"./temp_repos/{repo_folder}.zip"
            with open(zip_file_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            # Extract archive
            extract_target = f"./temp_repos/temp_{repo_folder}"
            with zipfile.ZipFile(zip_file_path, "r") as zip_ref:
                zip_ref.extractall(extract_target)

            # Move root extracted folder to expected repo_path
            extracted_subdirs = os.listdir(extract_target)
            if extracted_subdirs:
                root_extracted = os.path.join(extract_target, extracted_subdirs[0])
                shutil.move(root_extracted, repo_path)

            # Clean up temporaries
            os.remove(zip_file_path)
            shutil.rmtree(extract_target, ignore_errors=True)

            return True, repo_path
        else:
            return False, f"Repository '{repo_name}' was not found or is private (HTTP {response.status_code})."
    except Exception as zip_err:
        return False, f"Failed to download repository '{repo_name}': {str(zip_err)}"

# ================= UTIL ================= #

def clean_path(path: str, repo_path: str) -> str:
    return os.path.relpath(path, repo_path).replace("\\", "/")

def is_valid_file(file: str) -> bool:
    filename = os.path.basename(file)
    if filename in IGNORE_FILES:
        return False
    return file.endswith(ALLOWED_EXTS) and not filename.startswith(".")

def should_skip(path: str) -> bool:
    parts = path.split(os.sep)
    return any(p in parts for p in IGNORE_DIRS)

def format_files(files: Set[str]) -> str:
    sorted_files = sorted(files)
    return "\n".join([f"- {f.split('/')[-1]}" for f in sorted_files]) if sorted_files else "No files found."

# ================= CODE DETECTION UTILS ================= #

def contains_code_patterns(text: str) -> bool:
    """Detects if a raw string contains code syntax or programming constructs."""
    code_indicators = [
        r"\b(import|export|const|let|var|function|async|await|return|class|require|if|else|try|catch)\b",
        r"// FILE:",
        r"=>",
        r"[\{\}\(\)\[\];=]{3,}",
        r"router\.(get|post|put|delete|use)\("
    ]
    return any(re.search(pattern, text) for pattern in code_indicators)

def extract_pasted_code_and_instruction(msg: str) -> Tuple[Optional[str], str]:
    """
    Separates user instructions from pasted source code blocks.
    """
    code_blocks = re.findall(r"```(?:\w+)?\n?(.*?)```", msg, re.DOTALL)
    if code_blocks:
        code_content = "\n\n".join(code_blocks).strip()
        instruction = re.sub(r"```(?:\w+)?\n?(.*?)```", "", msg, flags=re.DOTALL).strip()
        return code_content, instruction if instruction else "Explain this code."

    if contains_code_patterns(msg):
        leading_match = re.match(r"^([^\n\{};=]+(?:\?|\:)?)\n", msg)
        if leading_match and any(kw in leading_match.group(1).lower() for kw in ["explain", "summarize", "describe", "what", "paragraph"]):
            instruction = leading_match.group(1).strip()
            code_content = msg[leading_match.end():].strip()
            return code_content, instruction

        explain_match = re.search(r"\(?explain.*?\)?$", msg, re.IGNORECASE)
        if explain_match:
            instruction = explain_match.group(0).strip("() ")
            code_content = msg[:explain_match.start()].strip()
            return code_content, instruction

        first_line = msg.split("\n")[0].strip()
        if len(first_line) < 100 and any(kw in first_line.lower() for kw in ["explain", "paragraph", "summary", "overview"]):
            instruction = first_line
            code_content = "\n".join(msg.split("\n")[1:]).strip()
            return code_content, instruction

        return msg, "Explain this code."

    return None, msg

# ================= REFORMULATE QUERY WITH HISTORY ================= #

def reformulate_query_with_history(msg: str, history: Optional[List[Dict[str, str]]], llm) -> str:
    msg_clean = msg.lower().strip()
    conversational_triggers = {
        "hi", "hello", "hey", "hello there", "hey hi", "good morning", "good evening",
        "ok", "okay", "no", "n", "yes", "y", "sure", "thanks", "thank you", "k", "got it", "fine","bye","by"
    }
    
    if not history or msg_clean in conversational_triggers or msg_clean == "..":
        return msg

    formatted_history = ""
    for turn in history[-4:]:
        role = turn.get("role", "user")
        content = turn.get("content", "")
        formatted_history += f"{role.capitalize()}: {content}\n"

    prompt = f"""
Given the following conversation history and a new user question, rephrase the new question into a standalone, clear technical prompt.

CRITICAL INSTRUCTIONS:
- Preserve specific terms in the new question (e.g., 'frontend', 'backend', 'config', 'paragraph', 'explain repo', 'with code').
- DO NOT convert requests to explain/summarize the repo into a file list or file count query.

CONVERSATION HISTORY:
{formatted_history}

NEW USER QUESTION:
{msg}

STANDALONE REPHRASED QUERY:
"""
    try:
        standalone = llm.invoke(prompt).content.strip()
        return standalone if standalone else msg
    except Exception:
        return msg

# ================= STRUCTURED FRONTEND + BACKEND VIEW ================= #

def format_files_with_headings(inventory: Dict[str, Set[str]], repo_name: str) -> str:
    frontend = sorted(inventory["frontend"])
    backend = sorted(inventory["backend"])

    def format_list(files):
        return "\n".join([f"- {f.split('/')[-1]}" for f in files]) if files else "No files found."

    return f"""
📁 FRONTEND FILES FOR PROJECT '{repo_name}' ({len(frontend)}):
{format_list(frontend)}

📁 BACKEND FILES FOR PROJECT '{repo_name}' ({len(backend)}):
{format_list(backend)}
"""

# ================= FILE HANDLING ================= #

def detect_file_request(msg: str) -> bool:
    msg = msg.lower()
    return any(ext in msg for ext in ALLOWED_EXTS)

def extract_filename(msg: str) -> Optional[str]:
    words = msg.replace(",", " ").split()
    for w in words:
        for ext in ALLOWED_EXTS:
            if w.lower().endswith(ext):
                return w.strip()
    return None

def get_exact_file(repo_path: str, filename: str) -> Tuple[Optional[str], Optional[str]]:
    for root, _, files in os.walk(repo_path):
        for f in files:
            if f.lower() == filename.lower():
                full_path = os.path.join(root, f)
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as file:
                        return file.read(), clean_path(full_path, repo_path)
                except Exception:
                    return None, None
    return None, None

# ================= RESPONSE MODE DETECTION ================= #

def detect_response_mode(msg: str) -> str:
    msg = msg.lower()

    if "only code" in msg or "just code" in msg:
        return "only_code"

    if "only explain" in msg or "just explain" in msg or "without code" in msg:
        return "explain_only"

    if "full code" in msg or "complete code" in msg:
        return "full_code"

    if "explain" in msg:
        return "explain"

    return "default"

# ================= CHUNKING ================= #

def chunk_code(code: str, chunk_size: int = 1200) -> List[str]:
    chunks = []
    for i in range(0, len(code), chunk_size):
        chunks.append(code[i:i + chunk_size])
    return chunks

# ================= INVALID / OUT OF CONTEXT FILTER ================= #

def is_invalid_query(msg: str) -> bool:
    msg_clean = msg.strip().lower()

    # Allow valid short conversational confirmations or dismissals
    valid_short = {"no", "ok", "n", "y", "k", "..", "yes", "sure", "thanks", "fine"}
    if msg_clean in valid_short:
        return False

    if len(msg_clean) < 2:
        return True

    if contains_code_patterns(msg):
        return False

    if re.search(r"(.)\1{5,}", msg_clean):
        return True

    alpha_num_ratio = sum(c.isalnum() for c in msg_clean) / max(len(msg_clean), 1)
    if alpha_num_ratio < 0.25:
        return True

    # Expanded out-of-context and personal queries filter
    off_topic_keywords = [
        "my name", "your name", "who are you", "how are you", "age", "job", "salary",
        "love", "relationship", "weather", "lunch", "dinner", "marry me", 
        "favorite color", "address", "phone number", "president", "capital of",
        "movie", "song", "joke", "recipe", "cryptocurrency", "bitcoin"
    ]

    if any(p in msg_clean for p in off_topic_keywords):
        return True

    return False 

# ================= SAFE SESSION HANDLING ================= #

def get_llm(repo_name: str):
    if repo_name not in sessions or sessions[repo_name].get("llm") is None:
        llm = ChatGroq(model_name="llama-3.1-8b-instant", temperature=0)

        if repo_name in sessions:
            sessions[repo_name]["llm"] = llm
        else:
            sessions[repo_name] = {"llm": llm, "retriever": None}

    return sessions[repo_name]["llm"]

# ================= REPO ANALYSIS ================= #

def build_inventory(repo_path: str) -> Dict[str, Set[str]]:
    inventory = {
        "frontend": set(),
        "backend": set(),
        "config": set(),
        "all": set()
    }

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for f in files:
            if not is_valid_file(f):
                continue

            full = os.path.join(root, f)
            if should_skip(full):
                continue

            rel = clean_path(full, repo_path)
            inventory["all"].add(rel)

            low = rel.lower()

            if any(x in low for x in ["frontend", "client", "ui", "components", "src/app", "src/pages", "views", "public"]):
                inventory["frontend"].add(rel)

            elif any(x in low for x in ["backend", "server", "api", "routes", "controllers", "models", "services"]):
                inventory["backend"].add(rel)

            elif any(x in low for x in ["config", "settings"]):
                inventory["config"].add(rel)

    return inventory

def build_architecture_map(inventory: Dict[str, Set[str]]) -> Dict[str, int]:
    return {
        "frontend_files": len(inventory["frontend"]),
        "backend_files": len(inventory["backend"]),
        "config_files": len(inventory["config"]),
        "total_files": len(inventory["all"])
    }

# ================= INTENT ================= #

def detect_intent(msg: str) -> str:
    msg_raw = msg.lower().strip()
    msg_compact = re.sub(r'[^a-z0-9]', '', msg_raw)

    greetings = {"hi", "hello", "hey", "hello there", "hey hi", "good morning", "good evening"}
    if msg_raw in greetings:
        return "greeting"

    # Conversational acknowledgment inputs
    acknowledgements = {"ok", "okay", "no", "n", "yes", "y", "sure", "thanks", "thank you", "k", "got it", "fine", ".."}
    if msg_raw in acknowledgements:
        return "acknowledgement"

    # 1. SUMMARY INTENT
    summary_keywords = ["summary", "overview", "explanation", "explain", "paragraph"]
    target_keywords = ["codebase", "repo", "repository", "project", "code", "repositoy", "repositry", "codebas"]
    
    has_explain = any(k in msg_raw or k in msg_compact for k in summary_keywords)
    has_target = any(t in msg_raw or t in msg_compact for t in target_keywords)

    if (has_explain and has_target) or "notfilename" in msg_compact or "notfilenames" in msg_compact:
        return "summary"

    # 2. LISTING / NAMING INTENT
    list_triggers = ["list", "show", "give", "names", "name", "tell me the files", "what are the files", "which files"]
    if any(x in msg_raw for x in list_triggers):
        if "frontend" in msg_raw and "backend" in msg_raw:
            return "frontend_backend_all"
        if "frontend" in msg_raw or "client" in msg_raw or "ui" in msg_raw:
            return "frontend_files"
        if "backend" in msg_raw or "server" in msg_raw or "api" in msg_raw:
            return "backend_files"
        return "all_files"

    # 3. COUNTING INTENT
    count_triggers = ["count", "number of", "how many", "file count", "total files", "how many files"]
    if any(x in msg_raw for x in count_triggers):
        if "frontend" in msg_raw and "backend" in msg_raw:
            return "frontend_backend_all"
        if "frontend" in msg_raw or "client" in msg_raw or "ui" in msg_raw:
            return "frontend_count"
        if "backend" in msg_raw or "server" in msg_raw or "api" in msg_raw:
            return "backend_count"
        return "file_count"

    if "where is" in msg_raw or "used in" in msg_raw:
        return "where_used"

    if any(x in msg_raw for x in ["what is", "explain", "concept", "how", "why"]):
        return "concept"

    return "rag"

# ================= SEARCH ================= #

def keyword_search(query: str, inventory: Dict[str, Set[str]]) -> List[str]:
    q = query.lower()
    return [f for f in inventory["all"] if q in f.lower()]

def deduplicate(docs: List[Document]) -> List[Document]:
    seen = set()
    out = []
    for d in docs:
        if d.page_content not in seen:
            out.append(d)
            seen.add(d.page_content)
    return out

# ================= SUMMARY GENERATOR ================= #

def generate_summary(repo_path: str, inventory: Dict[str, Set[str]], llm, arch_map: Dict[str, int], user_request: str = "") -> str:
    user_req_low = user_request.lower()
    
    wants_paragraph = any(kw in user_req_low for kw in ["paragraph", "in a paragraph", "single paragraph", "one paragraph"])

    key_keywords = ["app", "index", "server", "main", "route", "controller", "model", "context", "auth", "socket", "cloudinary"]
    priority_files = []
    
    for f in inventory["all"]:
        if any(k in f.lower() for k in key_keywords) and not f.endswith((".json", ".md")):
            priority_files.append(f)

    if len(priority_files) < 8:
        priority_files += [f for f in inventory["all"] if f not in priority_files and not f.endswith((".json", ".md"))]

    sample = priority_files[:10]

    snippets = []
    for f in sample:
        try:
            with open(os.path.join(repo_path, f), "r", encoding="utf-8", errors="ignore") as file:
                snippets.append(f"FILE: {f}\n{file.read()[:800]}")
        except Exception:
            continue

    if wants_paragraph:
        prompt = f"""
You are a senior software engineer. Analyze the repository context provided below and write a comprehensive overview strictly as a SINGLE continuous paragraph.

RULES:
- Respond in EXACTLY ONE single continuous paragraph of prose.
- Do NOT use markdown headers, section titles, bold headers, bullet points, numbered lists, or code snippets.
- Cover: application purpose, primary tech stack (frontend/backend), key data models, authentication mechanisms, and external integrations.

CODE SNIPPETS SAMPLE FROM REPO:
{snippets}
"""
        result = llm.invoke(prompt).content.strip()
        result = re.sub(r'#+\s*', '', result)
        result = re.sub(r'\n+', ' ', result)
        result = re.sub(r'^\s*[\-\*]\s*', '', result)
        return result.strip()

    include_code_snippets = any(kw in user_req_low for kw in ["with code", "code snippets", "snippets", "show code", "include code"])

    code_section_prompt = """
Code Snippets
Include 3 to 6 short, representative code snippets extracted from key files alongside a concise explanation for each snippet explaining what it does in the architecture.
""" if include_code_snippets else ""

    prompt = f"""
You are an expert software engineer analyzing a software repository.
Analyze the codebase context provided and generate a clear, structured system architectural breakdown.

STRICTLY USE THE FOLLOWING FORMAT:

System Overview
[Concise summary of what the application does, tech stack used for frontend/backend, and core domain.]

Frontend Architecture
[Framework used, structure, main components, routing, and state management details.]

Backend Architecture
[Server environment, database, authentication, API routes, middleware, external integrations.]

Key Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

System Flow
Here is a high-level overview of the system flow:
- [Feature Name]: [Step 1] -> [Step 2] -> [Step 3]

{code_section_prompt}

CRITICAL INSTRUCTIONS:
- Keep the breakdown structured, professional, and clear.
- Provide key code blocks inside markdown code fences with file headers when explaining snippets.

CODE SNIPPETS SAMPLE FROM REPO:
{snippets}
"""
    return llm.invoke(prompt).content.strip()

# ================= MAIN MESSAGE HANDLER ================= #

async def process_chat_message(
    repo_name: str, 
    message: str, 
    history: Optional[List[Dict[str, str]]] = None, 
    installation_id: Optional[str] = None,
    github_token: Optional[str] = None
) -> str:

    msg = message.strip()

    # 1. DIRECT CODE PASTE CHECK
    pasted_code, instruction = extract_pasted_code_and_instruction(msg)
    llm = get_llm(repo_name)

    if pasted_code and len(pasted_code) > 20:
        wants_paragraph = "paragraph" in instruction.lower() or "paragraph" in msg.lower()
        
        if wants_paragraph:
            prompt = f"""
You are a senior software engineer analyzing code provided directly by a developer.

DEVELOPER INSTRUCTION:
{instruction}

CODE SNIPPET:
{pasted_code[:5000]}

Please summarize and explain this code snippet in EXACTLY ONE single continuous paragraph.
Do NOT use headers, markdown titles, bullet points, or code snippets in your explanation.
"""
            res = llm.invoke(prompt).content.strip()
            res = re.sub(r'#+\s*', '', res)
            res = re.sub(r'\n+', ' ', res)
            res = re.sub(r'^\s*[\-\*]\s*', '', res)
            return res.strip()
        else:
            prompt = f"""
You are a senior software engineer analyzing code provided directly by a developer.

DEVELOPER INSTRUCTION:
{instruction}

CODE SNIPPET:
{pasted_code[:5000]}

Please provide a detailed, clear response addressing the developer's instructions precisely.
"""
            return llm.invoke(prompt).content.strip()

    # 2. INTENT DETECTION & VALIDATION
    raw_intent = detect_intent(msg)

    if raw_intent == "greeting":
        return f"Hello! How can I assist you with repository '{repo_name}' today?"

    if raw_intent == "acknowledgement":
        return "Understood. Let me know whenever you need further assistance with the codebase."

    if is_invalid_query(msg):
        return "❌ I am a technical assistant for repository analysis. Please ask a clear, project-related question."

    # 3. AUTO FETCH / CLONE REPOSITORY IF MISSING
    success, repo_path_or_err = ensure_repo_exists(repo_name, github_token=github_token)
    if not success:
        return repo_path_or_err

    repo_path = repo_path_or_err
    repo_folder = repo_name.replace("/", "_")
    db_path = f"./db/{repo_folder}"

    inventory = build_inventory(repo_path)
    arch_map = build_architecture_map(inventory)

    direct_intents = {
        "summary", "frontend_count", "backend_count", "file_count", 
        "frontend_backend_all", "frontend_files", "backend_files", "all_files"
    }
    
    if raw_intent in direct_intents:
        intent = raw_intent
    else:
        contextualized_msg = reformulate_query_with_history(msg, history, llm)
        intent = detect_intent(contextualized_msg)

    # ================= REPO FILE HANDLING ================= #

    is_file_query = detect_file_request(msg)
    filename = extract_filename(msg)

    if is_file_query and filename:
        file_content, file_path = get_exact_file(repo_path, filename)

        if not file_content:
            return f"File '{filename}' not found in project '{repo_name}'."

        mode = detect_response_mode(msg)

        if mode == "only_code":
            return file_content[:8000]

        if mode == "full_code":
            return f"📄 FILE: {file_path}\n\n{file_content[:8000]}"

        if mode == "explain_only":
            chunks = chunk_code(file_content[:4000])
            explanations = []

            for i, chunk in enumerate(chunks):
                prompt = f"""
You are a senior software engineer. Explain this code chunk clearly. Do NOT output code snippets unless necessary.

CHUNK:
{chunk}

DEVELOPER REQUEST:
{msg}
"""
                res = llm.invoke(prompt).content.strip()
                explanations.append(f"Chunk {i+1}:\n{res}")

            return f"📄 FILE: {file_path}\n\n🧠 EXPLANATION:\n" + "\n\n".join(explanations)

        trimmed_code = file_content[:4000]
        prompt = f"""You are a senior software engineer. Explain the following code succinctly without repeating entire source code blocks.\n\nDEVELOPER REQUEST:\n{msg}\n\nCODE:\n{trimmed_code}"""
        explanation = llm.invoke(prompt).content.strip()

        return f"📄 FILE: {file_path}\n\n🧠 EXPLANATION:\n{explanation}"

    # ================= DATABASE & RETRIEVAL INIT ================= #

    if repo_name not in sessions or sessions[repo_name].get("retriever") is None:
        if os.path.exists(db_path):
            vs = Chroma(persist_directory=db_path, embedding_function=embeddings)
        else:
            docs = []

            for f in inventory["all"]:
                try:
                    with open(os.path.join(repo_path, f), "r", encoding="utf-8", errors="ignore") as file:
                        content = file.read()
                        if content.strip():
                            docs.append(Document(
                                page_content=f"FILE: {f}\n{content}",
                                metadata={"source": f}
                            ))
                except Exception:
                    continue

            splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150)
            vs = Chroma.from_documents(
                splitter.split_documents(docs),
                embeddings,
                persist_directory=db_path
            )

        sessions[repo_name]["retriever"] = vs.as_retriever(search_kwargs={"k": 4})

    retriever = sessions[repo_name]["retriever"]

    # Metadata & Summary Answers
    if intent == "file_count":
        return f"The total number of valid source files for repository '{repo_name}' is {arch_map['total_files']}."

    if intent == "frontend_count":
        return f"The number of frontend files for repository '{repo_name}' is {arch_map['frontend_files']}."

    if intent == "backend_count":
        return f"The number of backend files for repository '{repo_name}' is {arch_map['backend_files']}."

    if intent == "frontend_backend_all":
        return format_files_with_headings(inventory, repo_name)

    if intent == "all_files":
        return f"📁 FILES IN REPOSITORY '{repo_name}':\n" + format_files(inventory["all"])

    if intent == "frontend_files":
        return f"📁 FRONTEND FILES IN REPOSITORY '{repo_name}':\n" + format_files(inventory["frontend"])

    if intent == "backend_files":
        return f"📁 BACKEND FILES IN REPOSITORY '{repo_name}':\n" + format_files(inventory["backend"])

    if intent == "summary":
        return generate_summary(repo_path, inventory, llm, arch_map, user_request=msg)

    if intent == "concept":
        docs = deduplicate(retriever.invoke(msg))
        context = "\n\n".join(d.page_content for d in docs)[:MAX_CONTEXT]

        if not context:
            return f"No relevant concept context found in repository '{repo_name}'."

        prompt = f"""
You are a senior software engineer assistant analyzing repository '{repo_name}'.

INSTRUCTIONS:
- Answer concisely using application logic from context.
- Avoid outputting long code listings unless requested.
- Ignore package locks, build artifacts, or configuration locks.

CONTEXT:
{context}

QUESTION:
{msg}
"""
        return llm.invoke(prompt).content.strip()

    if intent == "where_used":
        kw = keyword_search(msg, inventory)
        docs = retriever.invoke(msg)
        results = list(set(kw + [d.metadata.get("source", "") for d in docs]))
        results = [r for r in results if r]
        return "\n".join(results) if results else f"Not found in repository '{repo_name}'."

    # Default RAG Processing
    docs = deduplicate(retriever.invoke(msg))
    kw = keyword_search(msg, inventory)

    context = "\n\n".join([d.page_content for d in docs] + kw[:3])[:MAX_CONTEXT]

    if not context:
        return f"Information not found in repository '{repo_name}'."

    prompt = f"""
You are a senior software engineer assistant working on repository '{repo_name}'.

RULES:
- Respond accurately to the developer's message.
- Do NOT include unnecessary or excessively long code blocks in your answers unless requested.
- Ignore package-lock files, dependencies lists, and third-party node module metadata.
- Focus exclusively on custom application source code logic.

CONTEXT:
{context}

DEVELOPER REQUEST:
{msg}
"""

    return llm.invoke(prompt).content.strip()