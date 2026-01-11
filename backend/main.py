# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, email_verify, mfa, github, invite
from db.models import Base
from db.session import engine

# ------------------------------
# Create tables if not exist
# ------------------------------
Base.metadata.create_all(bind=engine)

# ------------------------------
# Initialize FastAPI app
# ------------------------------
app = FastAPI(title="CodeVerse Backend")

# ------------------------------
# CORS middleware
# ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Routers
# ------------------------------
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(email_verify.router, prefix="/auth", tags=["email"])
app.include_router(mfa.router, prefix="/mfa", tags=["mfa"])
app.include_router(github.router, prefix="/api/github", tags=["github"])
app.include_router(invite.router, prefix="/api/invite", tags=["invite"])
