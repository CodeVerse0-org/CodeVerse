import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
import socketio
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables at the very beginning
load_dotenv()

# Socket Service
from services.socket_service import sio

# Routers
from routers.auth import router as auth_router
from routers.email_verify import router as email_router
from routers.mfa import router as mfa_router
from routers.github import router as github_router
from routers.invite import router as invite_router
from routers.visualization import router as visualization_router
from routers.auth_reset import router as reset_router
from routers.users import router as users_router
from routers.summaries import router as summaries_router
from routers.chatbot import router as chatbot_router
from routers.webhook_service import router as webhook_router
from routers.audit_logs import router as audit_logs_router
from routers.notifications import router as notification_router
# --------------------
# ALLOWED ORIGINS (CORS Setup)
# --------------------
ALLOWED_ORIGINS = [
    "https://code-verse-git-main-code-verse-s-projects.vercel.app",
    "https://code-verse-do54sfbio-code-verse-s-projects.vercel.app",
    "https://code-verse-one.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
# Configure Socket.IO allowed origins dynamically
sio._cors_allowed_origins = ALLOWED_ORIGINS

# --------------------
# LIFESPAN (Startup/Shutdown)
# --------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles Neo4j connection lifecycle."""
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")
    
    # --- DEBUG GITHUB TOKEN START ---
    github_token = os.getenv("GITHUB_TOKEN")
    print("------------------------------------------")
    if github_token:
        print(f"✅ GITHUB_TOKEN Loaded: {github_token[:8]}***")
    else:
        print("❌ GITHUB_TOKEN NOT FOUND IN .ENV")
    print("------------------------------------------")
    # --- DEBUG GITHUB TOKEN END ---

    try:
        # Attach driver to app.state so routers can find it
        app.state.neo4j_driver = GraphDatabase.driver(uri, auth=(user, password))
        app.state.neo4j_driver.verify_connectivity()
        print("✅ Neo4j Connection Established")
    except Exception as e:
        print(f"❌ Failed to connect to Neo4j: {e}")
    
    yield  # --- App is running ---
    
    # Shutdown logic
    if hasattr(app.state, "neo4j_driver"):
        app.state.neo4j_driver.close()
        print("Neo4j Driver Connection Closed")

# --------------------
# FASTAPI APP
# --------------------
fastapi_app = FastAPI(
    title="CodeVerse Backend",
    default_response_class=ORJSONResponse,
    lifespan=lifespan
)

# --------------------
# CORS
# --------------------
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------
# ROUTES
# --------------------
# Route mounts: Router prefixes in main.py will register paths correctly
fastapi_app.include_router(auth_router, prefix="/auth")
fastapi_app.include_router(email_router, prefix="/auth")
fastapi_app.include_router(reset_router, prefix="/auth")
fastapi_app.include_router(mfa_router, prefix="/mfa")

fastapi_app.include_router(github_router, prefix="/api/github")
fastapi_app.include_router(invite_router, prefix="/api/invite")
fastapi_app.include_router(users_router, prefix="/api/user")
fastapi_app.include_router(summaries_router, prefix="/api/summaries")
fastapi_app.include_router(chatbot_router)
fastapi_app.include_router(visualization_router)
fastapi_app.include_router(webhook_router)
fastapi_app.include_router(audit_logs_router)
fastapi_app.include_router(notification_router)

@fastapi_app.get("/")
def root():
    return {"status": "ok"}

# --------------------
# SOCKET MOUNT (FINAL)
# --------------------
app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=fastapi_app,
    socketio_path="/socket.io"
)