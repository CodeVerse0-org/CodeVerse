from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, mfa, github

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(mfa.router, prefix="/mfa", tags=["mfa"])
app.include_router(github.router, prefix="/api/github", tags=["github"])
