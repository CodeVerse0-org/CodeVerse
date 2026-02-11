# github.py
import time
from jose import jwt
import requests
import httpx

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from db.models import UserRepository
from db.session import get_db as get_sqlalchemy_db
from db.connection import get_db
from utils.security import decode_access_token
from config import settings

GITHUB_APP_ID = settings.GITHUB_APP_ID
GITHUB_PRIVATE_KEY = settings.GITHUB_PRIVATE_KEY
GITHUB_APP_SLUG = settings.GITHUB_APP_SLUG

router = APIRouter(tags=["GitHub"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ------------------------------
# Helpers
# ------------------------------
def get_current_user_id(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return int(user_id)

def get_github_jwt():
    if not GITHUB_PRIVATE_KEY:
        raise HTTPException(status_code=500, detail="GitHub Private Key missing")
    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + 600, "iss": GITHUB_APP_ID}
    return jwt.encode(payload, GITHUB_PRIVATE_KEY, algorithm="RS256")

def get_installation_access_token(installation_id: int):
    jwt_token = get_github_jwt()
    headers = {"Authorization": f"Bearer {jwt_token}", "Accept": "application/vnd.github+json"}
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    resp = requests.post(url, headers=headers)
    if resp.status_code != 201:
        raise HTTPException(status_code=500, detail=f"Failed to get token for ID {installation_id}")
    return resp.json().get("token")

# ------------------------------
# GitHub App Install URL
# ------------------------------
@router.get("/install-url")
def get_install_url(user_id: int = Depends(get_current_user_id)):
    redirect_uri = "http://localhost:5173/github-callback"
    url = f"https://github.com/apps/{GITHUB_APP_SLUG}/installations/new?state={user_id}&redirect_uri={redirect_uri}"
    return {"url": url}

# ------------------------------
# Finalize GitHub App Installation
# ------------------------------
@router.post("/finalize")
def finalize_github_connection(
    installation_id: int = Query(...),
    user_id: int = Depends(get_current_user_id)
):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO github_installations (admin_user_id, org_id, installation_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (org_id) DO UPDATE SET installation_id = EXCLUDED.installation_id
        """, (user_id, installation_id, installation_id))

        cur.execute("UPDATE users SET github_connected=TRUE WHERE id=%s", (user_id,))
        conn.commit()
    finally:
        cur.close()
        conn.close()
    return {"status": "success", "installation_id": installation_id}

# ------------------------------
# Developer Assigned Repos (FIXED)
# ------------------------------
@router.get("/developer/repos")
def get_developer_repos(
    db: Session = Depends(get_sqlalchemy_db),
    user_id: int = Depends(get_current_user_id)
):
    assigned = db.query(UserRepository).filter_by(user_id=user_id).all()
    if not assigned:
        return []

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT installation_id
            FROM github_installations
            ORDER BY id DESC
            LIMIT 1
        """)
        inst = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not inst or not inst[0]:
        return []

    installation_id = inst[0]
    token = get_installation_access_token(installation_id)
    # Using 'token' prefix for repo access
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

    results = []
    for a in assigned:
        try:
            resp = requests.get(f"https://api.github.com/repositories/{a.repo_id}", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                results.append({
                    "repo_id": a.repo_id,
                    "repo_name": data.get("name"),
                    "full_name": data.get("full_name"),
                    "html_url": data.get("html_url"),
                    "installation_id": installation_id  # <-- ADDED: Crucial for frontend
                })
        except requests.RequestException:
            continue

    return results