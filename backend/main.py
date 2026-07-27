import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import RedirectResponse, ORJSONResponse
from fastapi.middleware.cors import CORSMiddleware
import socketio
from neo4j import GraphDatabase
from dotenv import load_dotenv

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
from routers.smtp_test import router as smtp_test_router

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.codeverse.codes").rstrip('/')

# --------------------
# LIFESPAN
# --------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")

    try:
        app.state.neo4j_driver = GraphDatabase.driver(uri, auth=(user, password))
        app.state.neo4j_driver.verify_connectivity()
        print("✅ Neo4j Connection Established")
    except Exception as e:
        print(f"❌ Failed to connect to Neo4j: {e}")
    
    yield
    
    if hasattr(app.state, "neo4j_driver"):
        app.state.neo4j_driver.close()

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------
# ROUTES
# --------------------
fastapi_app.include_router(auth_router, prefix="/auth")
fastapi_app.include_router(email_router, prefix="/auth")
fastapi_app.include_router(reset_router, prefix="/auth")
fastapi_app.include_router(mfa_router, prefix="/mfa")

fastapi_app.include_router(github_router, prefix="/api/github")
fastapi_app.include_router(invite_router, prefix="/api/invite")
fastapi_app.include_router(users_router, prefix="/api/user")
fastapi_app.include_router(summaries_router, prefix="/api/summaries")
fastapi_app.include_router(visualization_router)
fastapi_app.include_router(chatbot_router)
fastapi_app.include_router(webhook_router)
fastapi_app.include_router(audit_logs_router)
fastapi_app.include_router(notification_router)
fastapi_app.include_router(smtp_test_router)

# Safety Catch: Redirect any direct API GET requests for invitation accept back to Frontend
@fastapi_app.get("/accept-invite/{token}")
def redirect_to_frontend_invite(token: str):
    return RedirectResponse(url=f"{FRONTEND_URL}/accept-invite/{token}")

@fastapi_app.get("/")
def root():
    return {"status": "ok"}

# --------------------
# SOCKET MOUNT
# --------------------
app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=fastapi_app,
    socketio_path="/socket.io"
)