from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.models import Base
from db.session import engine
from db.connection import get_neo4j_driver

from routers.auth import router as auth_router
from routers.email_verify import router as email_router
from routers.mfa import router as mfa_router
from routers.github import router as github_router
from routers.invite import router as invite_router
from routers.visualization import router as visualization_router
from routers.auth_reset import router as reset_router
from routers.users import router as users_router
from routers.summaries import router as summaries_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeVerse Backend")

@app.on_event("startup")
def startup_event():
    try:
        app.state.neo4j_driver = get_neo4j_driver()
        print("✅ Neo4j connected")
    except Exception as e:
        print("⚠️ Neo4j not available:", e)
        app.state.neo4j_driver = None

@app.on_event("shutdown")
def shutdown_event():
    driver = getattr(app.state, "neo4j_driver", None)
    if driver:
        driver.close()
        print("🛑 Neo4j closed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(email_router, prefix="/auth", tags=["email"])
app.include_router(reset_router, prefix="/auth", tags=["password-reset"])
app.include_router(mfa_router, prefix="/mfa", tags=["mfa"])

# API routes
app.include_router(github_router, prefix="/api/github", tags=["github"])
app.include_router(invite_router, prefix="/api/invite", tags=["invite"])
app.include_router(users_router, prefix="/api/user", tags=["users"])
app.include_router(summaries_router, prefix="/api/summaries", tags=["summaries"])

# Updated: The prefix is now handled inside visualization.py via APIRouter(prefix="/api/repos")
app.include_router(visualization_router)

@app.get("/")
def root():
    return {"status": "ok", "message": "CodeVerse API running"}