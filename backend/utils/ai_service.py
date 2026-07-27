import os
import re
import time
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
    "bundle.js", "main.js.map", "tsconfig.json", "package.json"
}

MAX_CONTEXT = 6000

# ================= UTIL ================= #

def clean_path(path: str, repo_path: str):
    return os.path.relpath(path, repo_path).replace("\\", "/")

def is_valid_file(file):
    filename = os.path.basename(file)
    if filename in IGNORE_FILES:
        return False
    return file.endswith(ALLOWED_EXTS) and not filename.startswith(".")

def should_skip(path):
    parts = path.split(os.sep)
    return any(p in parts for p in IGNORE_DIRS)

def format_files(files):
    files = sorted(files)
    return "\n".join([f"- {f.split('/')[-1]}" for f in files]) if files else "No files found."

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
    Separates user instructions (e.g., 'explain this code in paragraph') 
    from pasted source code blocks.
    """
    code_blocks = re.findall(r"```(?:\w+)?\n?(.*?)```", msg, re.DOTALL)
    if code_blocks:
        code_content = "\n\n".join(code_blocks).strip()
        instruction = re.sub(r"```(?:\w+)?\n?(.*?)```", "", msg, flags=re.DOTALL).strip()
        return code_content, instruction if instruction else "Explain this code."

    if contains_code_patterns(msg):
        leading_match = re.match(r"^([^\n\{};=]+(?:\?|\:)?)\n", msg)
        if leading_match and any(kw in leading_match.group(1).lower() for kw in ["explain", "summarize", "describe", "what"]):
            instruction = leading_match.group(1).strip()
            code_content = msg[leading_match.end():].strip()
            return code_content, instruction

        explain_match = re.search(r"\(?explain.*?\)?$", msg, re.IGNORECASE)
        if explain_match:
            instruction = explain_match.group(0).strip("() ")
            code_content = msg[:explain_match.start()].strip()
            return code_content, instruction
        
        return msg, "Explain this code."

    return None, msg

# ================= REFORMULATE QUERY WITH HISTORY ================= #

def reformulate_query_with_history(msg: str, history: Optional[List[Dict[str, str]]], llm) -> str:
    msg_clean = msg.lower().strip()
    greetings = {"hi", "hello", "hey", "hello there", "hey hi", "good morning", "good evening"}
    
    if not history or msg_clean in greetings:
        return msg

    formatted_history = ""
    for turn in history[-4:]:
        role = turn.get("role", "user")
        content = turn.get("content", "")
        formatted_history += f"{role.capitalize()}: {content}\n"

    prompt = f"""
Given the following conversation history and a new user question, rephrase the new question into a standalone, clear technical prompt.

CRITICAL INSTRUCTIONS:
- Preserve specific terms in the new question (e.g., 'frontend', 'backend', 'config', 'name of files', 'list', 'explain repo', 'with code').
- DO NOT convert requests to explain/summarize the repo into a file list or file count query.

CONVERSATION HISTORY:
{formatted_history}

NEW USER QUESTION:
{msg}

STANDALONE REPHRASED QUERY:
"""
    try:
        standalone = llm.invoke(prompt).content.strip()
        print(f"🔄 [REFORMULATE] Original: '{msg}' -> Standalone: '{standalone}'")
        return standalone if standalone else msg
    except Exception as e:
        print(f"⚠️ [REFORMULATE ERROR] {e}")
        return msg

# ================= STRUCTURED FRONTEND + BACKEND VIEW ================= #

def format_files_with_headings(inventory, repo_name):
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

def detect_file_request(msg: str):
    msg = msg.lower()
    return any(ext in msg for ext in ALLOWED_EXTS)

def extract_filename(msg: str):
    words = msg.replace(",", " ").split()
    for w in words:
        for ext in ALLOWED_EXTS:
            if w.lower().endswith(ext):
                return w.strip()
    return None

def get_exact_file(repo_path, filename):
    for root, _, files in os.walk(repo_path):
        for f in files:
            if f.lower() == filename.lower():
                full_path = os.path.join(root, f)
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as file:
                        return file.read(), clean_path(full_path, repo_path)
                except:
                    return None, None
    return None, None

# ================= RESPONSE MODE DETECTION ================= #

def detect_response_mode(msg: str):
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

def chunk_code(code: str, chunk_size: int = 1200):
    chunks = []
    for i in range(0, len(code), chunk_size):
        chunks.append(code[i:i + chunk_size])
    return chunks

# ================= INVALID QUERY FILTER ================= #

def is_invalid_query(msg: str):
    msg_clean = msg.strip().lower()

    if len(msg_clean) < 2:
        return True

    if contains_code_patterns(msg):
        return False

    if re.search(r"(.)\1{5,}", msg_clean):
        return True

    alpha_num_ratio = sum(c.isalnum() for c in msg_clean) / max(len(msg_clean), 1)
    if alpha_num_ratio < 0.3:
        return True

    personal_keywords = [
        "my name", "your name", "who are you",
        "how are you", "age", "job", "salary",
        "love", "relationship", "weather", "lunch", "dinner",
        "marry me", "favorite color", "address", "phone number",
    ]

    if any(p in msg_clean for p in personal_keywords):
        return True

    return False 

# ================= SAFE SESSION HANDLING ================= #

def get_llm(repo_name):
    if repo_name not in sessions or sessions[repo_name].get("llm") is None:
        llm = ChatGroq(model_name="llama-3.1-8b-instant", temperature=0)

        if repo_name in sessions:
            sessions[repo_name]["llm"] = llm
        else:
            sessions[repo_name] = {"llm": llm, "retriever": None}

    return sessions[repo_name]["llm"]

# ================= REPO ANALYSIS ================= #

def build_inventory(repo_path):
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

def build_architecture_map(inventory):
    return {
        "frontend_files": len(inventory["frontend"]),
        "backend_files": len(inventory["backend"]),
        "config_files": len(inventory["config"]),
        "total_files": len(inventory["all"])
    }

# ================= INTENT ================= #

def detect_intent(msg: str):
    msg_raw = msg.lower().strip()
    msg_compact = re.sub(r'[^a-z0-9]', '', msg_raw)

    if msg_raw in ["hi", "hello", "hey", "hello there", "hey hi", "good morning", "good evening"]:
        return "greeting"

    # 1. SUMMARY INTENT
    summary_keywords = ["summary", "overview", "explanation", "explain"]
    target_keywords = ["codebase", "repo", "repository", "project", "code", "repositoy", "repositry", "repositty", "codebas", "rpsort"]
    
    has_explain = any(k in msg_raw or k in msg_compact for k in summary_keywords)
    has_target = any(t in msg_raw or t in msg_compact for t in target_keywords)

    if (has_explain and has_target) or "notfilename" in msg_compact or "notfilenames" in msg_compact:
        return "summary"

    # 2. LISTING INTENT
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

def keyword_search(query, inventory):
    q = query.lower()
    return [f for f in inventory["all"] if q in f.lower()]

def deduplicate(docs):
    seen = set()
    out = []
    for d in docs:
        if d.page_content not in seen:
            out.append(d)
            seen.add(d.page_content)
    return out

# ================= ENHANCED CODEBASE SUMMARY GENERATOR ================= #

def generate_summary(repo_path, inventory, llm, arch_map, user_request=""):
    print(f"⚙️ [AI SERVICE] Generating architectural summary for repo path: {repo_path}")
    include_code_snippets = any(kw in user_request.lower() for kw in ["with code", "code snippets", "snippets", "show code", "include code"])

    key_keywords = ["app", "index", "server", "main", "route", "controller", "model", "context", "auth", "socket", "service", "api", "page"]
    priority_files = []
    
    # Priority on active code files, eliminating non-source config/lock files
    for f in sorted(inventory["all"]):
        filename = os.path.basename(f)
        if filename in IGNORE_FILES or f.endswith((".json", ".md")):
            continue
        if any(k in f.lower() for k in key_keywords):
            priority_files.append(f)

    if len(priority_files) < 8:
        for f in sorted(inventory["all"]):
            filename = os.path.basename(f)
            if f not in priority_files and filename not in IGNORE_FILES and not f.endswith((".json", ".md")):
                priority_files.append(f)

    sample = priority_files[:12]
    print(f"📦 [AI SERVICE] Selected {len(sample)} key source files for summary evaluation: {sample}")

    snippets = []
    for f in sample:
        try:
            with open(os.path.join(repo_path, f), "r", encoding="utf-8", errors="ignore") as file:
                snippets.append(f"FILE HEADER: {f}\n{file.read()[:900]}")
        except Exception as err:
            print(f"⚠️ [FILE READ ERROR] Couldn't read {f}: {err}")
            continue

    code_section_prompt = """
Code Snippets
Include 3 to 5 key representative code snippets extracted from primary application files (e.g., Controllers, Routes, Services, Components) alongside a concise explanation for each snippet describing its responsibility in the architecture.
""" if include_code_snippets else ""

    prompt = f"""
You are an expert software architect analyzing a custom application repository.
Your task is to analyze the source code and generate a high-level, clear technical system breakdown of the repository.

DO NOT explain package managers, package-lock metadata, or node_modules dependencies.
Focus strictly on custom application logic, routes, domain features, and core workflows.

STRICTLY USE THE FOLLOWING FORMAT:

System Overview
[Concise summary of what the custom application does, tech stack used for frontend/backend, and core domain purpose.]

Frontend Architecture
[Framework used, project layout, main UI components, client routing, and state management.]

Backend Architecture
[Server environment, framework/API structures, database models, authentication mechanisms, services, and integrations.]

Key Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

System Flow
Here is a high-level overview of the core application flow:
- [Feature Name]: [Step 1] -> [Step 2] -> [Step 3]

{code_section_prompt}

SOURCE CODE CONTEXT SAMPLE:
{snippets}
"""
    print("🚀 [AI SERVICE] Sending context to ChatGroq LLM...")
    response = llm.invoke(prompt).content.strip()
    print("✅ [AI SERVICE] Architectural summary generated successfully.")
    return response

# ================= MAIN ================= #

async def process_chat_message(repo_name, message, history=None, installation_id=None):
    start_time = time.time()
    msg = message.strip()
    print(f"\n==================== [CHAT PROCESS START] ====================")
    print(f"📥 [REQUEST] Repo: '{repo_name}' | Query: '{msg}'")

    # 1. DIRECT CODE PASTE CHECK
    pasted_code, instruction = extract_pasted_code_and_instruction(msg)
    llm = get_llm(repo_name)

    if pasted_code and len(pasted_code) > 20:
        print("⚡ [INTENT] Direct Code Paste detected.")
        prompt = f"""
You are a senior software engineer analyzing code provided directly by a developer.

DEVELOPER INSTRUCTION:
{instruction}

CODE SNIPPET:
{pasted_code[:5000]}

Please provide a detailed, clear response addressing the developer's instructions precisely.
"""
        res = llm.invoke(prompt).content.strip()
        print(f"🏁 [CHAT PROCESS END] Elapsed: {round(time.time() - start_time, 2)}s")
        return res

    # 2. INTENT DETECTION & VALIDATION
    raw_intent = detect_intent(msg)
    print(f"🎯 [INTENT] Raw detected intent: '{raw_intent}'")

    if raw_intent == "greeting":
        return f"Hello! How can I assist you with repository '{repo_name}' today?"

    if is_invalid_query(msg):
        print("❌ [VALIDATION] Query marked as invalid non-technical message.")
        return "❌ I am a technical assistant for repository analysis. Please ask a clear, project-related question."

    repo_folder = repo_name.replace("/", "_")
    repo_path = f"./temp_repos/{repo_folder}"
    db_path = f"./db/{repo_folder}"

    print(f"📂 [PATHS] Repo Path: '{repo_path}' | Vector DB Path: '{db_path}'")

    if not os.path.exists(repo_path):
        print(f"❌ [PATH ERROR] Local repository target '{repo_path}' does not exist.")
        return f"Repository '{repo_name}' was not found."

    inventory = build_inventory(repo_path)
    arch_map = build_architecture_map(inventory)
    print(f"📊 [INVENTORY] Total Source Files: {arch_map['total_files']} | Frontend: {arch_map['frontend_files']} | Backend: {arch_map['backend_files']}")

    direct_intents = {
        "summary", "frontend_count", "backend_count", "file_count", 
        "frontend_backend_all", "frontend_files", "backend_files", "all_files"
    }
    
    if raw_intent in direct_intents:
        intent = raw_intent
    else:
        contextualized_msg = reformulate_query_with_history(msg, history, llm)
        intent = detect_intent(contextualized_msg)
        print(f"🎯 [INTENT] Post-history intent: '{intent}'")

    # ================= REPO FILE HANDLING ================= #

    is_file_query = detect_file_request(msg)
    filename = extract_filename(msg)

    if is_file_query and filename:
        print(f"📄 [FILE DIRECT] Requesting specific file: '{filename}'")
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

    # ================= VECTOR DATABASE & RETRIEVAL INIT ================= #

    if repo_name not in sessions or sessions[repo_name].get("retriever") is None:
        if os.path.exists(db_path) and len(os.listdir(db_path)) > 0:
            print(f"💾 [VECTOR DB] Loading existing Chroma database from '{db_path}'")
            vs = Chroma(persist_directory=db_path, embedding_function=embeddings)
        else:
            print(f"🔨 [VECTOR DB] Creating new Chroma vector index at '{db_path}'...")
            docs = []

            for f in inventory["all"]:
                filename = os.path.basename(f)
                # Ensure package managers and lock files are strictly ignored
                if filename in IGNORE_FILES or f.endswith((".json", ".lock")):
                    continue

                try:
                    full_file_path = os.path.join(repo_path, f)
                    with open(full_file_path, "r", encoding="utf-8", errors="ignore") as file:
                        content = file.read()
                        if content.strip():
                            docs.append(Document(
                                page_content=f"FILE: {f}\n{content}",
                                metadata={"source": f}
                            ))
                except Exception as file_err:
                    print(f"⚠️ [INDEXING SKIP] Could not index file '{f}': {file_err}")
                    continue

            print(f"📄 [VECTOR DB] Total documents filtered for vector embedding: {len(docs)}")
            splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150)
            split_docs = splitter.split_documents(docs)
            print(f"🧩 [VECTOR DB] Total chunked documents: {len(split_docs)}")
            
            vs = Chroma.from_documents(
                documents=split_docs,
                embedding=embeddings,
                persist_directory=db_path
            )

        sessions[repo_name]["retriever"] = vs.as_retriever(search_kwargs={"k": 5})

    retriever = sessions[repo_name]["retriever"]

    # Direct Metadata Answers
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
        ans = generate_summary(repo_path, inventory, llm, arch_map, user_request=msg)
        print(f"🏁 [CHAT PROCESS END] Elapsed: {round(time.time() - start_time, 2)}s")
        return ans

    if intent == "concept":
        print("🔎 [RAG] Performing concept retrieval search...")
        docs = deduplicate(retriever.invoke(msg))
        context = "\n\n".join(d.page_content for d in docs)[:MAX_CONTEXT]

        if not context:
            return f"No relevant concept context found in repository '{repo_name}'."

        prompt = f"""
You are a senior software engineer assistant analyzing custom application repository '{repo_name}'.

INSTRUCTIONS:
- Answer concisely using custom application source code logic from context.
- Avoid outputting long code listings unless requested.
- Focus strictly on custom source logic and architectural patterns.

CONTEXT:
{context}

QUESTION:
{msg}
"""
        ans = llm.invoke(prompt).content.strip()
        print(f"🏁 [CHAT PROCESS END] Elapsed: {round(time.time() - start_time, 2)}s")
        return ans

    if intent == "where_used":
        print("🔎 [SEARCH] Executing keyword and vector search for usage context...")
        kw = keyword_search(msg, inventory)
        docs = retriever.invoke(msg)
        results = list(set(kw + [d.metadata.get("source", "") for d in docs]))
        results = [r for r in results if r]
        return "\n".join(results) if results else f"Not found in repository '{repo_name}'."

    # Default RAG Processing
    print("🔎 [RAG] Executing general semantic context retrieval...")
    docs = deduplicate(retriever.invoke(msg))
    kw = keyword_search(msg, inventory)

    context = "\n\n".join([d.page_content for d in docs] + kw[:3])[:MAX_CONTEXT]

    if not context:
        return f"Information not found in repository '{repo_name}'."

    prompt = f"""
You are a senior software engineer assistant working on repository '{repo_name}'.

RULES:
- Respond accurately to the developer's message based on custom application source code.
- Do NOT include unnecessary or excessively long code blocks in your answers unless requested.
- Ignore package-lock files, dependencies lists, and third-party node module metadata.
- Focus exclusively on custom application source code logic.

CONTEXT:
{context}

DEVELOPER REQUEST:
{msg}
"""

    ans = llm.invoke(prompt).content.strip()
    print(f"🏁 [CHAT PROCESS END] Elapsed: {round(time.time() - start_time, 2)}s")
    return ans