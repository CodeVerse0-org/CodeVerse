import os
import re
from typing import List, Dict, Optional, Set

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
IGNORE_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", "venv", ".next"}

MAX_CONTEXT = 9000

# ================= UTIL ================= #

def clean_path(path: str, repo_path: str):
    return os.path.relpath(path, repo_path).replace("\\", "/")

def is_valid_file(file):
    return file.endswith(ALLOWED_EXTS) and not file.startswith(".")

def should_skip(path):
    return any(p in path.split(os.sep) for p in IGNORE_DIRS)

def format_files(files):
    files = sorted(files)
    return "\n".join([f"- {f.split('/')[-1]}" for f in files]) if files else "No files found."

# ================= 🔥 NEW: STRUCTURED FRONTEND + BACKEND VIEW ================= #

def format_files_with_headings(inventory):
    frontend = sorted(inventory["frontend"])
    backend = sorted(inventory["backend"])

    def format_list(files):
        return "\n".join([f"- {f}" for f in files]) if files else "No files found."

    return f"""
📁 FRONTEND FILES
{format_list(frontend)}

📁 BACKEND FILES
{format_list(backend)}
"""

# ================= 🔥 FILE HANDLING (NEW) ================= #

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

# ================= 🔥 RESPONSE MODE DETECTION ================= #

def detect_response_mode(msg: str):
    msg = msg.lower()

    if "only explain" in msg or "just explain" in msg or "without code" in msg:
        return "explain_only"

    if "full code" in msg or "show code" in msg:
        return "full_code"

    if "snippet" in msg or "small part" in msg:
        return "snippet"

    return "default"

# ================= 🔥 INVALID QUERY FILTER (UPDATED ONLY HERE) ================= #

def is_invalid_query(msg: str):

    msg_clean = msg.strip().lower()

    if len(msg_clean) < 3:
        return True

    # too many repeated characters (aaaaaa, !!!!!)
    if re.search(r"(.)\1{5,}", msg_clean):
        return True

    # mostly non-alphanumeric (gibberish like ???!!!@@@)
    alpha_num_ratio = sum(c.isalnum() for c in msg_clean) / max(len(msg_clean), 1)
    if alpha_num_ratio < 0.5:
        return True

    # no vowels at all → likely gibberish
    if not re.search(r"[aeiou]", msg_clean):
        return True

    words = msg_clean.split()

    # repeated single-word spam
    if len(set(words)) == 1 and len(words) > 1:
        return True

    # keyboard smash detection
    if re.fullmatch(r"[a-z]{1,2}\d{2,}|[a-z]{6,}", msg_clean) and len(set(msg_clean)) > 6:
        return True

    # long meaningless string without spaces
    if len(words) == 1 and len(msg_clean) > 20 and alpha_num_ratio > 0.9:
        return True

    # personal / irrelevant questions
    personal_keywords = [
        "my name", "your name", "who are you",
        "how are you", "age", "job", "salary",
        "love", "relationship"
    ]

    if any(p in msg_clean for p in personal_keywords):
        return True

    return False

# ================= 🔥 SAFE SESSION HANDLING ================= #

def get_llm(repo_name):
    if repo_name not in sessions or sessions[repo_name].get("llm") is None:
        llm = ChatGroq(model_name="llama-3.1-8b-instant", temperature=0)

        if repo_name in sessions:
            sessions[repo_name]["llm"] = llm
        else:
            sessions[repo_name] = {"llm": llm, "retriever": None}

    return sessions[repo_name]["llm"]

def get_retriever(repo_name):
    return sessions.get(repo_name, {}).get("retriever")

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

            if any(x in low for x in ["frontend", "client", "ui", "components"]):
                inventory["frontend"].add(rel)

            elif any(x in low for x in ["backend", "server", "api", "routes", "controllers", "models"]):
                inventory["backend"].add(rel)

            elif any(x in low for x in ["config", ".json", ".env", "settings"]):
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
    msg = msg.lower().strip()

    if msg in ["hi", "hello", "hey"]:
        return "greeting"

    if len(msg.split()) < 2:
        return "unclear"

    if any(x in msg for x in ["file", "files", "list", "show", "give", "tell"]):
        if "frontend and backend" in msg or "all frontend backend" in msg:
            return "frontend_backend_all"
        if "frontend" in msg:
            return "frontend_files"
        if "backend" in msg:
            return "backend_files"
        if "all" in msg:
            return "all_files"

    if any(x in msg for x in ["count", "number", "how many"]):
        if "frontend" in msg:
            return "frontend_count"
        if "backend" in msg:
            return "backend_count"
        return "file_count"

    if "summary" in msg or "overview" in msg:
        if any(x in msg for x in ["repo", "repository", "project"]):
            return "summary"

    if "where is" in msg or "used in" in msg:
        return "where_used"

    if any(x in msg for x in ["what is", "explain", "concept", "how", "why"]):
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

# ================= SUMMARY ================= #

def generate_summary(repo_path, inventory, llm, arch_map):
    sample = list(inventory["all"])[:6]

    snippets = []
    for f in sample:
        try:
            with open(os.path.join(repo_path, f), "r", encoding="utf-8", errors="ignore") as file:
                snippets.append(f"FILE: {f}\n{file.read()[:400]}")
        except:
            continue

    prompt = f"""
You are a senior software engineer.

TASK:
Write a clear, human-readable SUMMARY of the repository.

CRITICAL RULES:
- Output MUST be a single coherent paragraph
- Do NOT use headings, bullet points, or numbered lists
- Only break into sections if the user explicitly asks for them
- Do not hallucinate missing architecture details
- Keep it concise but informative

DATA:
{snippets}

ARCHITECTURE STATS:
{arch_map}
"""

    return llm.invoke(prompt).content.strip()

# ================= MAIN ================= #

async def process_chat_message(repo_name, message, history=None, installation_id=None):

    msg = message.strip()

    if is_invalid_query(msg):
        return "❌ Your question is not valid for repository analysis. Please ask a clear technical question."

    repo_folder = repo_name.replace("/", "_")
    repo_path = f"./temp_repos/{repo_folder}"
    db_path = f"./db/{repo_folder}"

    if not os.path.exists(repo_path):
        return "Repository not found."

    inventory = build_inventory(repo_path)
    arch_map = build_architecture_map(inventory)

    llm = get_llm(repo_name)
    retriever = get_retriever(repo_name)

    # ================= FILE HANDLING ================= #

    is_file_query = detect_file_request(msg)
    filename = extract_filename(msg)

    if is_file_query and filename:
        file_content, file_path = get_exact_file(repo_path, filename)

        if not file_content:
            return f"File '{filename}' not found in repository."

        mode = detect_response_mode(msg)

        trimmed_code = file_content[:6000]

        if mode == "explain_only":
            prompt = f"""
You are a senior software engineer.

Explain this code in a clear paragraph.
Do NOT include code in your response.

CODE:
{trimmed_code}
"""
            explanation = llm.invoke(prompt).content.strip()

            return f"""📄 FILE: {file_path}

🧠 EXPLANATION:
{explanation}
"""

        if mode == "full_code":
            return f"""📄 FILE: {file_path}

{file_content[:15000]}
"""

        prompt = f"""
You are a senior software engineer.

Explain the code clearly.
Only include small snippets if absolutely necessary.

CODE:
{trimmed_code}
"""
        explanation = llm.invoke(prompt).content.strip()

        return f"""📄 FILE: {file_path}

🧠 EXPLANATION:
{explanation}
"""

    # ================= RETRIEVAL INIT ================= #

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
                except:
                    continue

            splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150)
            vs = Chroma.from_documents(
                splitter.split_documents(docs),
                embeddings,
                persist_directory=db_path
            )

        sessions[repo_name]["retriever"] = vs.as_retriever(search_kwargs={"k": 6})
        retriever = sessions[repo_name]["retriever"]

    intent = detect_intent(msg)

    if intent == "greeting":
        return "Hello, how can I assist you?"

    if intent == "unclear":
        return "Be more specific. Ask something meaningful about the repository."

    if intent == "file_count":
        return f"{arch_map['total_files']}"

    if intent == "frontend_count":
        return f"{arch_map['frontend_files']}"

    if intent == "backend_count":
        return f"{arch_map['backend_files']}"

    if intent == "frontend_backend_all":
        return format_files_with_headings(inventory)

    if intent == "all_files":
        return format_files(inventory["all"])

    if intent == "frontend_files":
        return format_files(inventory["frontend"])

    if intent == "backend_files":
        return format_files(inventory["backend"])

    if intent == "summary":
        return generate_summary(repo_path, inventory, llm, arch_map)

    if intent == "concept":
        docs = deduplicate(retriever.invoke(msg))
        context = "\n\n".join(d.page_content for d in docs)[:MAX_CONTEXT]

        if not context:
            return "Not found in repository."

        prompt = f"""
Explain using repo context.

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

        return "\n".join(results) if results else "Not found in repository."

    docs = deduplicate(retriever.invoke(msg))
    kw = keyword_search(msg, inventory)

    context = "\n\n".join([d.page_content for d in docs] + kw[:5])[:MAX_CONTEXT]

    if not context:
        return "Not found in repository."

    prompt = f"""
You are a senior software engineer assistant.

RULES:
- Use repository context only
- Do not hallucinate file structure

CONTEXT:
{context}

QUESTION:
{msg}
"""

    return llm.invoke(prompt).content.strip()