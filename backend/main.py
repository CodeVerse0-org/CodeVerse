from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, email_verify, mfa, github, invite, visualization 
from db.models import Base
from db.session import engine

# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeVerse Backend")

# CORS Configuration - Matches your React development ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# ROUTER REGISTRATION
# =====================================================

# 1. Auth & Verification (Prefixes defined here or in router files)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(email_verify.router, prefix="/auth", tags=["email"])
app.include_router(mfa.router, prefix="/mfa", tags=["mfa"])

# 2. GitHub Integration
# Note: visualization.router already has prefix="/api/repos" defined inside the file.
# Including it without a prefix here prevents URL duplication (404 errors).
app.include_router(github.router, prefix="/api/github", tags=["github"]) 
app.include_router(invite.router, prefix="/api/invite", tags=["invite"])
app.include_router(visualization.router) 

@app.get("/")
async def root():
    return {"message": "CodeVerse API is running", "status": "healthy"}