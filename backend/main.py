from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, email_verify, mfa, github, invite, visualization, auth_reset, users
from db.models import Base
from db.session import engine
from db.connection import get_neo4j_driver
from routers import summaries # Import your new file



# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeVerse Backend")

@app.on_event("startup")
async def startup_event():
    app.state.neo4j_driver = get_neo4j_driver()
    print("🚀 Neo4j AuraDB Connection established")

@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app.state, "neo4j_driver"):
        app.state.neo4j_driver.close()
        print("🛑 Neo4j Connection closed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTER REGISTRATION
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(email_verify.router, prefix="/auth", tags=["email"])
app.include_router(auth_reset.router, prefix="/auth", tags=["password-reset"])
app.include_router(mfa.router, prefix="/mfa", tags=["mfa"])
app.include_router(github.router, prefix="/api/github", tags=["github"]) 
app.include_router(invite.router, prefix="/api/invite", tags=["invite"])
app.include_router(visualization.router) 
app.include_router(users.router, prefix="/api/user", tags=["users"])

app.include_router(summaries.router)

@app.get("/")
async def root():
    return {"message": "CodeVerse API is running", "status": "healthy"}