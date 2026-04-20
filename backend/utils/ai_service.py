import os
from git import Repo
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import ConversationalRetrievalChain
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import HumanMessage, AIMessage  # ✅ Added for formatting
from typing import Any, Dict, List

load_dotenv()

sessions = {}
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# --- CUSTOM LOGGING HANDLER ---
class GroqLogHandler(BaseCallbackHandler):
    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any):
        print("\n🚀 [GROQ CALL STARTED]")
        print(f"📡 Model: {serialized.get('name', 'llama-3.3-70b-versatile')}")

    def on_llm_end(self, response: Any, **kwargs: Any):
        print("✅ [GROQ CALL FINISHED]")
        usage = response.llm_output.get("token_usage", {})
        if usage:
            print(f"📊 Tokens: {usage.get('total_tokens')}")

    def on_llm_error(self, error: Exception, **kwargs: Any):
        print(f"❌ [GROQ ERROR]: {error}")

# --- ENHANCED VISUAL PROMPT ---
custom_template = """You are a Senior Full-Stack Developer. 
Your goal is to provide a visually structured, highly readable, and technical response.

STRICT FORMATTING RULES:
1. Use 📂 for file paths, ⚙️ for logic, and 💡 for suggestions.
2. Use Bold Headers (### 📂 Section Name) for each section.
3. Use Markdown Tables if comparing multiple items.
4. Wrap all code snippets in proper syntax highlighting blocks (e.g., ```jsx).
5. If a solution is found, end with a '🚀 Summary' section.

Context: {context}
Question: {question}

Detailed Answer:"""

QA_PROMPT = PromptTemplate(template=custom_template, input_variables=["context", "question"])

def load_repo_files(repo_path):
    allowed_ext = (".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".cpp", ".cs", ".html", ".css")
    documents = []
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'venv']]
        for file in files:
            if file.lower().endswith(allowed_ext):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        if content.strip():
                            doc_content = f"FILE: {file_path}\n\n{content}"
                            documents.append(Document(page_content=doc_content, metadata={"source": file_path}))
                except Exception: continue
    return documents

async def process_chat_message(repo_name: str, message: str, history=None):
    repo_folder = repo_name.replace("/", "_")
    repo_path = f"./temp_repos/{repo_folder}"
    persist_db_path = f"./db/free_vector_{repo_folder}"
    
    if not os.path.exists(repo_path):
        Repo.clone_from(f"[https://github.com/](https://github.com/){repo_name}.git", repo_path)

    # --- HISTORY CONVERSION LOGIC ---
    # ✅ Convert the dictionary list from frontend to LangChain Objects
    formatted_history = []
    if history:
        for msg in history:
            if msg.get('role') == 'user':
                formatted_history.append(HumanMessage(content=msg['content']))
            else:
                formatted_history.append(AIMessage(content=msg['content']))

    if repo_name not in sessions:
        if os.path.exists(persist_db_path) and os.listdir(persist_db_path):
            vectorstore = Chroma(persist_directory=persist_db_path, embedding_function=embeddings)
        else:
            docs = load_repo_files(repo_path)
            texts = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150).split_documents(docs)
            vectorstore = Chroma.from_documents(documents=texts, embedding=embeddings, persist_directory=persist_db_path)

        log_handler = GroqLogHandler()
        llm = ChatGroq(
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama-3.3-70b-versatile",
            temperature=0.2,
            callbacks=[log_handler]
        )
        
        sessions[repo_name] = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=vectorstore.as_retriever(search_kwargs={"k": 6}),
            combine_docs_chain_kwargs={"prompt": QA_PROMPT}
        )

    chain = sessions[repo_name]
    try:
        # ✅ Invoke using the correctly formatted history
        result = chain.invoke({
            "question": message, 
            "chat_history": formatted_history
        })
        return result["answer"]
    except Exception as e:
        print(f"❌ Groq System Error: {e}")
        return "⚠️ I encountered an error processing your request. Please try again."