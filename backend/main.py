from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, email_verify, mfa, github, invite, visualization, auth_reset,users
from db.models import Base
from db.session import engine
# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeVerse Backend")

# UPDATED: More robust CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTER REGISTRATION
# email_verify and auth_reset both use prefix="/auth"
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(email_verify.router, prefix="/auth", tags=["email"])
app.include_router(auth_reset.router, prefix="/auth", tags=["password-reset"])

app.include_router(mfa.router, prefix="/mfa", tags=["mfa"])
app.include_router(github.router, prefix="/api/github", tags=["github"]) 
app.include_router(invite.router, prefix="/api/invite", tags=["invite"])
app.include_router(visualization.router) 
# Change this line in main.py:
app.include_router(users.router, prefix="/api/user", tags=["users"])
@app.get("/")
async def root():
    return {"message": "CodeVerse API is running", "status": "healthy"}