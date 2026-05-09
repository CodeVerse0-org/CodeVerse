import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
import socketio
from neo4j import GraphDatabase  # ✅ Required for initialization

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

# --------------------
# FASTAPI APP
# --------------------
fastapi_app = FastAPI(
    title="CodeVerse Backend",
    default_response_class=ORJSONResponse
)

# --------------------
# NEO4J INITIALIZATION ✅ 
# --------------------
@fastapi_app.on_event("startup")
async def startup_event():
    """Initializes the Neo4j driver on startup and attaches it to app state."""
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")
    
    try:
        # Attach driver to fastapi_app.state so routers can find it
        fastapi_app.state.neo4j_driver = GraphDatabase.driver(uri, auth=(user, password))
        # Verify connection
        fastapi_app.state.neo4j_driver.verify_connectivity()
        print("✅ Neo4j Connection Established")
    except Exception as e:
        print(f"❌ Failed to connect to Neo4j: {e}")

@fastapi_app.on_event("shutdown")
async def shutdown_event():
    """Closes the Neo4j driver connection on shutdown."""
    if hasattr(fastapi_app.state, "neo4j_driver"):
        fastapi_app.state.neo4j_driver.close()
        print("Neo4j Driver Connection Closed")

# --------------------
# CORS
# --------------------
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
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
fastapi_app.include_router(chatbot_router)
fastapi_app.include_router(visualization_router)
fastapi_app.include_router(webhook_router)

@fastapi_app.get("/")
def root():
    return {"status": "ok"}

# --------------------
# SOCKET MOUNT (FINAL)
# --------------------
# This wraps the FastAPI app. Because the driver is attached to 
# fastapi_app.state, it will be available to all FastAPI routers.
app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=fastapi_app,
    socketio_path="/socket.io"
)