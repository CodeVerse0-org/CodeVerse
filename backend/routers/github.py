import time
import jwt
import requests
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from db.models import UserRepository
from db.session import get_db as get_sqlalchemy_db
from db.connection import get_db
from utils.security import decode_access_token
from config import settings

# -----------------------------
# GitHub App Config
# -----------------------------
GITHUB_APP_ID = settings.GITHUB_APP_ID
GITHUB_PRIVATE_KEY = settings.GITHUB_PRIVATE_KEY
GITHUB_APP_SLUG = settings.GITHUB_APP_SLUG

router = APIRouter(tags=["GitHub"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# -----------------------------
# Helpers
# -----------------------------
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
        raise HTTPException(status_code=500, detail="Failed to get installation access token")
    return resp.json().get("token")

# -----------------------------
# Endpoints
# -----------------------------

@router.get("/install-url")
def get_install_url(user_id: int = Depends(get_current_user_id)):
    """
    Returns the GitHub App installation URL for the user.
    """
    redirect_uri = "http://localhost:5173/github-callback"
    url = f"https://github.com/apps/{GITHUB_APP_SLUG}/installations/new?state={user_id}&redirect_uri={redirect_uri}"
    return {"url": url}


@router.post("/finalize")
def finalize_github_connection(
    installation_id: int = Query(...),
    user_id: int = Depends(get_current_user_id)
):
    """
    Save the GitHub installation ID for the admin user.
    Called after GitHub redirects back with installation_id.
    """
    conn = get_db()
    cur = conn.cursor()
    try:
        # Insert or update the installation
        cur.execute("""
            INSERT INTO github_installations (admin_user_id, org_id, installation_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (org_id) DO UPDATE SET installation_id = EXCLUDED.installation_id
        """, (user_id, installation_id, installation_id))
        # Mark user as connected
        cur.execute("UPDATE users SET github_connected=TRUE WHERE id=%s", (user_id,))
        conn.commit()
    finally:
        cur.close()
        conn.close()

    return {"status": "success", "installation_id": installation_id}


@router.get("/status")
def github_status(user_id: int = Depends(get_current_user_id)):
    """Check if the user has connected GitHub"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT github_connected FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return {"connected": row[0] if row else False}


@router.get("/repositories")
def get_admin_repos(user_id: int = Depends(get_current_user_id)):
    """Admin: fetch all repos from their GitHub App installation"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT installation_id FROM github_installations WHERE admin_user_id=%s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"repositories": []}

    installation_id = row[0]
    token = get_installation_access_token(installation_id)
    headers = {"Authorization": f"token {token}"}
    resp = requests.get("https://api.github.com/installation/repositories", headers=headers)
    if resp.status_code != 200:
        return {"repositories": []}

    return {"repositories": resp.json().get("repositories", [])}


@router.get("/developer/repos")
def get_developer_repos(
    db: Session = Depends(get_sqlalchemy_db),
    user_id: int = Depends(get_current_user_id)
):
    """Developer: fetch only repos assigned to this user"""
    assigned = db.query(UserRepository).filter_by(user_id=user_id).all()
    if not assigned:
        return []

    # Use first admin installation
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT installation_id FROM github_installations LIMIT 1")
    inst = cur.fetchone()
    cur.close()
    conn.close()
    if not inst:
        return []

    token = get_installation_access_token(inst[0])
    headers = {"Authorization": f"token {token}"}
    results = []

    for a in assigned:
        resp = requests.get(f"https://api.github.com/repositories/{a.repo_id}", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            results.append({
                "repo_id": a.repo_id,
                "repo_name": data.get("name"),
                "full_name": data.get("full_name"),
                "html_url": data.get("html_url")
            })
    return results
