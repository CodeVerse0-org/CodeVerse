import os
import re
import time
from difflib import SequenceMatcher
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

MAX_CONTEXT = 8000

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

def format_files(files) -> str:
    files = sorted(files)
    return "\n".join([f"- {f}" for f in files]) if files else "No files found."

def fuzzy_match(query: str, target: str, threshold: float = 0.75) -> bool:
    """Detects mistyped phrases or words based on string similarity."""
    ratio = SequenceMatcher(None, query.lower(), target.lower()).ratio()
    return ratio >= threshold

# ================= FORMAT PREFERENCE DETECTOR ================= #

def extract_format_preferences(msg: str) -> Dict[str, Optional[str]]:
    """Extracts formatting guidelines from the user query."""
    msg_low = msg.lower()
    prefs = {
        "format": None,      # 'bullets', 'paragraphs'
        "style": None,       # 'concise', 'detailed', 'simple'
        "include_code": False
    }

    # Format preferences
    if any(k in msg_low for k in ["bullet", "bullets", "bullet points", "list"]):
        prefs["format"] = "bullets"
    elif any(k in msg_low for k in ["paragraph", "paragraphs", "continuous text"]):
        prefs["format"] = "paragraphs"

    # Style preferences
    if any(k in msg_low for k in ["concise", "short", "brief", "summarized", "quick"]):
        prefs["style"] = "concise"
    elif any(k in msg_low for k in ["don't understand", "dont understand", "explain again", "simpler", "simple words", "easy words", "eli5"]):
        prefs["style"] = "simple"
    elif any(k in msg_low for k in ["detail", "detailed", "deep dive", "in depth"]):
        prefs["style"] = "detailed"

    # Code inclusion preferences
    if any(k in msg_low for k in ["with code", "include code", "show code", "code examples", "with snippet"]):
        prefs["include_code"] = True

    return prefs

def build_preference_instructions(prefs: Dict[str, Optional[str]]) -> str:
    """Generates prompt instructions according to detected user choices."""
    instructions = []
    
    if prefs["style"] == "simple":
        instructions.append("- Explain concepts using simple, plain, easy-to-understand terms and straightforward language.")
    elif prefs["style"] == "concise":
        instructions.append("- Keep the response extremely concise, direct, and focused on key points without extra filler.")
    elif prefs["style"] == "detailed":
        instructions.append("- Provide a detailed, in-depth technical explanation.")

    if prefs["format"] == "bullets":
        instructions.append("- Present the explanation strictly as formatted bullet points.")
    elif prefs["format"] == "paragraphs":
        instructions.append("- Present the explanation strictly in well-structured continuous paragraphs.")

    if prefs["include_code"]:
        instructions.append("- Explicitly include relevant code snippets to illustrate the logic.")

    return "\n".join(instructions) if instructions else ""

# ================= CODE DETECTION UTILS ================= #

def contains_code_patterns(text: str) -> bool:
    code_indicators = [
        r"\b(import|export|const|let|var|function|async|await|return|class|require|if|else|try|catch)\b",
        r"// FILE:",
        r"=>",
        r"[\{\}\(\)\[\];=]{3,}",
        r"router\.(get|post|put|delete|use)\("
    ]
    return any(re.search(pattern, text) for pattern in code_indicators)

def extract_pasted_code_and_instruction(msg: str) -> Tuple[Optional[str], str]:
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
    
    conversational_triggers = {
        "hi", "hello", "hey", "hello there", "hey hi", "good morning", "good evening",
        "bye", "goodbye", "cya", "see you", "exit", "thanks", "thank you", "ok", "okay", "great", "nice", "okk", ""
    }
    
    if msg_clean in conversational_triggers or any(fuzzy_match(msg_clean, g) for g in conversational_triggers):
        return msg

    formatted_history = ""
    if history:
        for turn in history[-4:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            formatted_history += f"{role.capitalize()}: {content}\n"

    prompt = f"""
You are an intelligent query reformulation module for CodeVerse AI.
Your job is to clean up user input, correct mistyped words automatically, infer the true intended request using conversation history, and output a clear, standalone technical query.

CONVERSATION HISTORY:
{formatted_history if formatted_history else "No previous history."}

RAW USER QUESTION:
{msg}

INSTRUCTIONS:
- Automatically correct spelling or syntax typos (e.g., 'explna' -> 'explain', 'fe' -> 'frontend', 'rotes' -> 'routes').
- Retain specific technical terms, file extensions, and module names.
- Do NOT convert conversational exits or simple follow-ups into complex code modifications.
- Output ONLY the rephrased standalone query string.
"""
    try:
        standalone = llm.invoke(prompt).content.strip()
        print(f"🔄 [REFORMULATE] Original: '{msg}' -> Corrected Query: '{standalone}'")
        return standalone if standalone else msg
    except Exception as e:
        print(f"⚠️ [REFORMULATE ERROR] {e}")
        return msg

# ================= STRUCTURED FRONTEND + BACKEND VIEW ================= #

def format_files_with_headings(inventory, repo_name):
    frontend = sorted(inventory["frontend"])
    backend = sorted(inventory["backend"])

    def format_list(files):
        return "\n".join([f"- {f}" for f in files]) if files else "No files found."

    return f"""
📁 FRONTEND FILES FOR PROJECT '{repo_name}' ({len(frontend)}):
{format_list(frontend)}

📁 BACKEND FILES FOR PROJECT '{repo_name}' ({len(backend)}):
{format_list(backend)}
"""

# ================= FILE HANDLING ================= #

def detect_file_request(msg: str) -> bool:
    msg = msg.lower()
    has_ext = any(ext in msg for ext in ALLOWED_EXTS)
    has_path_slash = "/" in msg or "\\" in msg
    return has_ext or has_path_slash

def extract_filename(msg: str) -> Optional[str]:
    """Extracts filenames or relative paths from the message."""
    words = msg.replace(",", " ").replace(":", " ").replace("`", " ").split()
    for w in words:
        clean_w = w.strip().strip("'\"()[]{}")
        for ext in ALLOWED_EXTS:
            if clean_w.lower().endswith(ext):
                return clean_w
            if fuzzy_match(clean_w.lower(), ext, threshold=0.85):
                return clean_w
    return None

def get_exact_file(repo_path: str, filename_or_path: str) -> Tuple[Optional[str], Optional[str]]:
    """Searches for a file by exact full relative path match or base filename match."""
    normalized_target = filename_or_path.replace("\\", "/").lower().strip("/")
    target_base = os.path.basename(normalized_target)

    # Priority 1: Match full relative path ending
    for root, _, files in os.walk(repo_path):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = clean_path(full_path, repo_path).lower()
            if rel_path == normalized_target or rel_path.endswith(normalized_target):
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as file:
                        return file.read(), clean_path(full_path, repo_path)
                except Exception:
                    return None, None

    # Priority 2: Match filename base with fuzzy fallback
    for root, _, files in os.walk(repo_path):
        for f in files:
            if f.lower() == target_base or fuzzy_match(f.lower(), target_base, threshold=0.85):
                full_path = os.path.join(root, f)
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as file:
                        return file.read(), clean_path(full_path, repo_path)
                except Exception:
                    return None, None
    return None, None

def detect_response_mode(msg: str) -> str:
    msg = msg.lower()
    if "only code" in msg or "just code" in msg: return "only_code"
    if "only explain" in msg or "just explain" in msg or "without code" in msg: return "explain_only"
    if "full code" in msg or "complete code" in msg: return "full_code"
    if "explain" in msg: return "explain"
    return "default"

# ================= INTENT & CONVERSATIONAL FILTERS ================= #

def detect_intent(msg: str) -> str:
    msg_raw = msg.lower().strip()
    msg_compact = re.sub(r'[^a-z0-9]', '', msg_raw)

    # 0. Dot / Single Punctuation Only
    if re.match(r"^[\.\?\!\,\;\:]+$", msg_raw):
        return "invalid_query"

    # 1. Personal / Identity Questions
    personal_triggers = [
        "how are you", "how r u", "how are u", "how do you do", "what is your name", 
        "whats your name", "who are you", "who made you", "who created you", "tell me about yourself",
        "what can you do", "where do you live", "are you human", "are you ai", "are you an ai",
        "who built you", "what is codeverse"
    ]
    if any(pt in msg_raw for pt in personal_triggers) or any(fuzzy_match(msg_raw, pt) for pt in personal_triggers):
        return "personal_question"

    # 2. Greetings & Farewell Rules
    greetings = ["hi", "hello", "hey", "hello there", "hey hi", "good morning", "good evening", "greetings"]
    farewells = ["bye", "goodbye", "cya", "see you", "exit", "quit", "bye bye"]
    
    if msg_raw in greetings or any(fuzzy_match(msg_raw, g) for g in greetings):
        return "greeting"
    if msg_raw in farewells or any(fuzzy_match(msg_raw, f) for f in farewells):
        return "farewell"

    # 3. Conversational Fillers / Out-of-Context Acknowledgments
    gibberish_list = [
        "ok", "okay", "great", "nice", "cool", "shh", "shhh", "shhhh", "lol", 
        "hmm", "hmmm", "haha", "hehe", "yep", "nope", "thanks", "thank you", "got it", "understoood", "okk"
    ]
    if msg_raw in gibberish_list or re.match(r"^(sh+)+$", msg_raw) or re.match(r"^(hm+)+$", msg_raw):
        return "gibberish"

    # 4. Continuous Follow-up Explanation Requests
    follow_up_triggers = [
        "i don't understand", "i dont understand", "didn't get it", "didnt get it",
        "explain again", "explain me again", "explain concise", "explain concisely",
        "in bullet", "in bullets", "bullet points", "in paragraph", "in paragraphs",
        "with code", "with codes", "simplify", "make it simple", "easy words"
    ]
    if any(ft in msg_raw for ft in follow_up_triggers):
        return "follow_up_explanation"

    # 5. Repository Overview Request (Handles all variations)
    summary_triggers = [
        "explain this repository", "explain repository", "explain the repository", 
        "explain me repository", "explain codebase", "explain code base", 
        "explain me codebase", "explain me code base", "describe this project", 
        "what does this repository do", "explain the architecture", "explain repo", 
        "project summary", "repo overview"
    ]
    if any(st in msg_raw for st in summary_triggers) or (
        any(k in msg_raw or k in msg_compact for k in ["summary", "overview", "architecture"]) and
        any(t in msg_raw or t in msg_compact for t in ["codebase", "code base", "repo", "repository", "project"])
    ):
        return "summary"

    # 6. Repeated Characters / Nonsense Words / Gibberish Strings
    if re.match(r"^(.)\1+$", msg_compact) or re.match(r"^(?:[b-df-hj-np-tv-z]{3,})$", msg_compact):
        return "invalid_query"

    nonsense_patterns = ["nnn", "bbb", "shishi", "asdf", "qwerty", "xyz", "blah"]
    if any(p in msg_raw for p in nonsense_patterns) and not detect_file_request(msg_raw):
        return "invalid_query"

    # 7. Complaints / Criticism / Out-of-Bounds Remarks
    complaint_keywords = [
        "wrong answer", "wrong answers", "you are wrong", "you are bad", "bad bot", 
        "bad ai", "useless", "stupid", "incorrect answer", "not helpful"
    ]
    if any(k in msg_raw for k in complaint_keywords):
        return "invalid_query"

    # 8. Incomplete / Ambiguous Queries
    incomplete_queries = ["explain", "what", "now", "tell me", "show me", "how", "why", "where", "this", "file"]
    if msg_raw in incomplete_queries:
        return "incomplete_query"

    # 9. Unrelated / Out-of-bounds non-programming questions
    out_of_bounds_keywords = [
        "weather", "sports", "football", "cricket", "president", "politics", "election",
        "recipe", "movie", "song", "joke", "marry me", "favorite color", "salary", "dinner", "lunch"
    ]
    if any(k in msg_raw for k in out_of_bounds_keywords):
        return "out_of_bounds"

    # 10. General Programming Question
    general_prog_keywords = [
        "what is a closure", "explain recursion", "difference between let and const",
        "what is async await", "how does rest api work", "what is high order function",
        "explain big o", "what is red-black tree", "explain dependency injection"
    ]
    if any(gpk in msg_raw for gpk in general_prog_keywords):
        return "general_programming"

    # 11. Strict File Counting Triggers
    if "how many frontend" in msg_raw or "frontend file count" in msg_raw or "number of frontend files" in msg_raw:
        return "frontend_count"
    if "how many backend" in msg_raw or "backend file count" in msg_raw or "number of backend files" in msg_raw:
        return "backend_count"
    if "how many files" in msg_raw or "total files" in msg_raw or "file count" in msg_raw or "number of files" in msg_raw:
        return "file_count"

    # 12. File Listings
    list_triggers = ["list", "show", "give", "names", "name", "tell me the files", "what are the files", "which files"]
    if any(x in msg_raw for x in list_triggers):
        if "frontend" in msg_raw and "backend" in msg_raw:
            return "frontend_backend_all"
        if any(x in msg_raw for x in ["frontend", "client", "ui", "components", "react", "vue", "angular", "css", "tailwind"]):
            return "frontend_files"
        if any(x in msg_raw for x in ["backend", "server", "api", "routes", "controllers", "models", "services", "database"]):
            return "backend_files"
        return "all_files"

    # 13. Categorized Frontend / Backend Search Scope
    if any(x in msg_raw for x in ["frontend", "ui", "pages", "routing", "components", "react", "vue", "angular", "css", "tailwind"]):
        return "frontend_query"
    if any(x in msg_raw for x in ["backend", "server", "api", "controller", "routes", "middleware", "authentication", "services", "models", "database"]):
        return "backend_query"

    if "where is" in msg_raw or "used in" in msg_raw:
        return "where_used"

    # 14. Code Writing / Modification Request
    if any(x in msg_raw for x in ["write", "create", "implement", "build", "fix", "modify", "complete code", "add route", "add component"]):
        return "coding_request"

    if any(x in msg_raw for x in ["what is", "concept", "how does", "why"]):
        return "concept"

    # Direct File/Path Explanation Fallback Check
    if detect_file_request(msg_raw):
        return "rag"

    # Short / Unrecognized inputs default to invalid
    if len(msg_raw.split()) < 2 and not detect_file_request(msg_raw):
        return "invalid_query"

    return "rag"

# ================= SAFE SESSION HANDLING ================= #

def get_llm(repo_name: str):
    if repo_name not in sessions or sessions[repo_name].get("llm") is None:
        llm = ChatGroq(model_name="llama-3.1-8b-instant", temperature=0.0)

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

# ================= SEARCH ================= #

def keyword_search(query: str, inventory: dict, scope: str = "all") -> List[str]:
    q = query.lower()
    target_files = inventory.get(scope, inventory["all"])
    return [f for f in target_files if any(part in f.lower() for part in q.split() if len(part) > 2)]

def deduplicate(docs: List[Document]) -> List[Document]:
    seen = set()
    out = []
    for d in docs:
        if d.page_content not in seen:
            out.append(d)
            seen.add(d.page_content)
    return out

# ================= OVERVIEW GENERATOR ================= #

def generate_summary(repo_path: str, inventory: dict, llm, arch_map: dict, user_request: str = "") -> str:
    key_keywords = ["app", "index", "server", "main", "route", "controller", "model", "context", "auth", "socket", "service", "api", "page"]
    priority_files = []
    
    for f in sorted(inventory["all"]):
        filename = os.path.basename(f)
        if filename in IGNORE_FILES or f.endswith((".json", ".md", ".d.ts")):
            continue
        if any(k in f.lower() for k in key_keywords):
            priority_files.append(f)

    if len(priority_files) < 8:
        for f in sorted(inventory["all"]):
            filename = os.path.basename(f)
            if f not in priority_files and filename not in IGNORE_FILES and not f.endswith((".json", ".md", ".d.ts")):
                priority_files.append(f)

    sample = priority_files[:12]

    snippets = []
    for f in sample:
        try:
            with open(os.path.join(repo_path, f), "r", encoding="utf-8", errors="ignore") as file:
                snippets.append(f"--- FILE: {f} ---\n{file.read()[:800]}")
        except Exception:
            continue

    has_fe = len(inventory["frontend"]) > 0
    has_be = len(inventory["backend"]) > 0

    fe_instruction = "Frontend Architecture\n[Explain framework, key routes, UI components, and state structure in clear paragraphs based ONLY on files provided.]" if has_fe else ""
    be_instruction = "Backend Architecture\n[Explain API frameworks, controllers, route handlers, and models in clear paragraphs based ONLY on files provided.]" if has_be else ""

    prompt = f"""
You are an expert software architect analyzing the repository '{repo_path}'.
Provide a structured technical breakdown of this repository based ONLY on the source code samples provided below.

RULES:
- Do NOT hallucinate features, technologies, or files not present in the snippets.
- Unless explicitly requested otherwise, write each section using continuous, well-structured paragraphs.

REQUIRED STRUCTURE:

Purpose
[Overall goal and application domain described in paragraph form.]

Technology Stack
[Core languages, frameworks, and active libraries.]

{fe_instruction}

{be_instruction}

Database & Authentication
[Database system, ORM, and auth mechanisms present in the code.]

API Structure & Overall Workflow
[Routing patterns, request lifecycle, and data flow.]

Folder Structure & Main Features
[Overview of the file layout and key features built.]

SOURCE CODE CONTEXT:
{chr(10).join(snippets)}
"""
    return llm.invoke(prompt).content.strip()

# ================= CODE ANALYSIS FOR PASTED SNIPPETS ================= #

def analyze_pasted_code(code: str, instruction: str, llm) -> str:
    prompt = f"""
You are CodeVerse AI, an expert code analysis system.
The developer has provided code and instructed: "{instruction}".

Perform a detailed, structured code analysis addressing the following:
1. Purpose & High-Level Functionality: Explain the purpose in clear paragraphs.
2. Structure & Imports: Explain imported packages and module structures.
3. Execution & Request Flow: Explain function logic, variables, and state execution flow step-by-step.
4. Output & Error Handling: Explain what the code returns or renders and how errors are handled.

INSTRUCTIONS:
- Write explanations in clear, readable paragraphs under section headings unless bullet points are explicitly requested.
- Do NOT rewrite the code with inline comments unless specifically requested.

SOURCE CODE:
{code[:6000]}
"""
    return llm.invoke(prompt).content.strip()

# ================= MAIN CHAT PROCESSOR ================= #

async def process_chat_message(repo_name: str, message: str, history: Optional[List[Dict[str, str]]] = None, installation_id: Optional[str] = None) -> str:
    start_time = time.time()
    msg = message.strip()
    print(f"\n==================== [CHAT PROCESS START] ====================")
    print(f"📥 [REQUEST] Repo: '{repo_name}' | Query: '{msg}'")

    llm = get_llm(repo_name)

    # 1. DIRECT CODE PASTE CHECK
    pasted_code, instruction = extract_pasted_code_and_instruction(msg)
    if pasted_code and len(pasted_code) > 20:
        return analyze_pasted_code(pasted_code, instruction, llm)

    # 2. INTENT CLASSIFICATION & INCOMPLETE / IRRELEVANT FILTERING
    raw_intent = detect_intent(msg)

    # Personal Questions Response
    if raw_intent == "personal_question":
        prompt = f"""
You are CodeVerse AI, an intelligent software engineering assistant specializing in code analysis and repository exploration.
Answer the following personal or identity question warmly, concisely, and professionally. Always mention that you are CodeVerse AI, fully focused on assisting with repository '{repo_name}'.

USER QUESTION: {msg}
"""
        return llm.invoke(prompt).content.strip()

    # Incomplete / Nonsensical / Out of Context / Complaints Check
    if raw_intent in ["invalid_query", "incomplete_query"]:
        return f"This question is incomplete or out of context. Please ask a clear, complete, and relevant question about repository '{repo_name}' or provide a specific file path."

    # Natural Greetings
    if raw_intent == "greeting":
        return f"Hello! 👋 I'm ready to help you explore and analyze '{repo_name}'. Feel free to ask about the frontend, backend, APIs, database, or specific code."

    # Natural Farewells
    if raw_intent == "farewell":
        return f"Goodbye! 👋 Let me know whenever you're ready to explore '{repo_name}' again."

    # Casual Fillers & Context Redirection
    if raw_intent == "gibberish":
        return f"This question is incomplete or out of context. Please ask a clear, complete, and relevant question about repository '{repo_name}'."

    # Unrelated Non-Programming Questions Redirect
    if raw_intent == "out_of_bounds":
        return f"I specialize in software development and analyzing repository '{repo_name}'. Please ask a relevant question about the project's code, architecture, APIs, frontend, backend, or database setup."

    # Answer General Programming Questions Directly
    if raw_intent == "general_programming":
        prompt = f"""You are CodeVerse AI, an expert programming assistant.
Answer the following general programming question clearly and concisely in paragraph form:

QUESTION: {msg}"""
        return llm.invoke(prompt).content.strip()

    repo_folder = repo_name.replace("/", "_")
    repo_path = f"./temp_repos/{repo_folder}"
    db_path = f"./db/{repo_folder}"

    if not os.path.exists(repo_path):
        return f"Repository '{repo_name}' was not found locally. Please ensure it is synchronized."

    inventory = build_inventory(repo_path)
    arch_map = build_architecture_map(inventory)

    # File Count Direct Responses
    if raw_intent == "frontend_count":
        return f"There are {arch_map['frontend_files']} frontend files in repository '{repo_name}'."
    if raw_intent == "backend_count":
        return f"There are {arch_map['backend_files']} backend files in repository '{repo_name}'."
    if raw_intent == "file_count":
        return f"There are {arch_map['total_files']} total files in repository '{repo_name}'."

    # Metadata & File Listing
    if raw_intent == "frontend_backend_all": return format_files_with_headings(inventory, repo_name)
    if raw_intent == "all_files": return f"📁 FILES IN REPOSITORY '{repo_name}':\n" + format_files(inventory["all"])
    if raw_intent == "frontend_files": return f"📁 FRONTEND FILES IN REPOSITORY '{repo_name}':\n" + format_files(inventory["frontend"])
    if raw_intent == "backend_files": return f"📁 BACKEND FILES IN REPOSITORY '{repo_name}':\n" + format_files(inventory["backend"])

    # Repository Overview Trigger (Consolidated for all phrasing variations)
    if raw_intent == "summary":
        return generate_summary(repo_path, inventory, llm, arch_map, user_request=msg)

    # Extract Formatting Preferences (concise, bullets, code, simple terms)
    user_prefs = extract_format_preferences(msg)
    custom_formatting_instructions = build_preference_instructions(user_prefs)

    # 3. CONTINUOUS FOLLOW-UP EXPLANATION RE-ANALYSIS ("Explain me again" handling)
    if raw_intent == "follow_up_explanation" and history:
        # Check if previous query was a repository summary request
        last_user_turn = ""
        for turn in reversed(history):
            if turn.get("role") == "user":
                last_user_turn = turn.get("content", "")
                break
        
        last_intent = detect_intent(last_user_turn) if last_user_turn else ""
        
        # If the user previously asked to explain the repository, re-generate repository summary
        if last_intent == "summary":
            return generate_summary(repo_path, inventory, llm, arch_map, user_request=msg)

        formatted_history = ""
        for turn in history[-4:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            formatted_history += f"{role.capitalize()}: {content}\n"

        followup_prompt = f"""
You are CodeVerse AI, an expert AI software architect for repository '{repo_name}'.
The user requested a clarification or format change regarding the previous conversation turn.

CONVERSATION HISTORY:
{formatted_history}

USER RE-EXPLANATION REQUEST:
{msg}

FORMATTING & STYLE INSTRUCTIONS:
{custom_formatting_instructions if custom_formatting_instructions else "- Adapt the previous explanation to match the user's intent clearly without drifting into irrelevant subjects."}

Provide an updated explanation re-analyzing the previous context following the exact rules above.
"""
        return llm.invoke(followup_prompt).content.strip()

    # Contextual Reformulation for Follow-ups
    contextualized_msg = reformulate_query_with_history(msg, history, llm)

    # Direct File Reading Requests & Exact Path Matches
    is_file_query = detect_file_request(msg)
    filename = extract_filename(msg)

    if is_file_query and filename:
        file_content, file_path = get_exact_file(repo_path, filename)
        if not file_content:
            matches = keyword_search(filename, inventory)
            return f"File '{filename}' was not found in repository '{repo_name}'." + (f"\n\nClosest matching files:\n" + format_files(matches[:5]) if matches else "")

        mode = detect_response_mode(msg)
        if mode == "only_code": 
            return file_content[:8000]
        if mode == "full_code": 
            return f"📄 FILE: {file_path}\n\n```\n{file_content[:8000]}\n```"

        trimmed_code = file_content[:8000]
        
        # Pull formatting instructions or fallback to default file explanation rules
        file_format_rule = (
            custom_formatting_instructions 
            if custom_formatting_instructions 
            else "- Display the main code structure/snippets first in a code block.\n- Explain the file purpose, imports, functions, execution flow, and API/database connections if present."
        )

        prompt = f"""You are CodeVerse AI analyzing repository '{repo_name}'.
Explain the code and logic in source file '{file_path}'. Always include key code snippets from the file when explaining.

FORMAT INSTRUCTIONS:
{file_format_rule}

FILE CONTENT:
{trimmed_code}"""
        
        explanation = llm.invoke(prompt).content.strip()
        return f"📄 FILE: {file_path}\n\n{explanation}"

    # VECTOR DB RETRIEVAL SETUP
    if repo_name not in sessions or sessions[repo_name].get("retriever") is None:
        if os.path.exists(db_path) and len(os.listdir(db_path)) > 0:
            vs = Chroma(persist_directory=db_path, embedding_function=embeddings)
        else:
            docs = []
            for f in inventory["all"]:
                filename_base = os.path.basename(f)
                if filename_base in IGNORE_FILES or f.endswith((".json", ".lock")): 
                    continue

                try:
                    full_file_path = os.path.join(repo_path, f)
                    with open(full_file_path, "r", encoding="utf-8", errors="ignore") as file:
                        content = file.read()
                        if content.strip():
                            docs.append(Document(
                                page_content=f"// FILE PATH: {f}\n{content}",
                                metadata={"source": f}
                            ))
                except Exception:
                    continue

            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
            split_docs = text_splitter.split_documents(docs)
            vs = Chroma.from_documents(split_docs, embedding=embeddings, persist_directory=db_path)
        
        sessions[repo_name]["retriever"] = vs.as_retriever(search_kwargs={"k": 5})

    retriever = sessions[repo_name]["retriever"]
    retrieved_docs = retriever.invoke(contextualized_msg)
    deduped_docs = deduplicate(retrieved_docs)

    context_str = "\n\n".join([doc.page_content for doc in deduped_docs])[:MAX_CONTEXT]

    rag_prompt = f"""
You are CodeVerse AI, an expert software architecture assistant analyzing repository '{repo_name}'.
Answer the developer's question using the provided code snippets and repository inventory.

DEVELOPER QUESTION:
{contextualized_msg}

FORMATTING INSTRUCTIONS:
{custom_formatting_instructions if custom_formatting_instructions else "- Provide a clear, technical answer referencing relevant files."}

CODEBASE CONTEXT:
{context_str}
"""
    return llm.invoke(rag_prompt).content.strip()