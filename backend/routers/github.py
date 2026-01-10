import time
import jwt
import requests
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from utils.security import decode_access_token
from db.connection import get_db
import psycopg2
from config import GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_APP_SLUG

router = APIRouter(tags=["GitHub"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Helper to get user_id from token
def get_current_user_id(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

# --- GitHub Auth Helpers ---
def get_github_jwt():
    """Generates a JWT to authenticate as the GitHub App."""
    if not GITHUB_PRIVATE_KEY:
        raise HTTPException(status_code=500, detail="GitHub Private Key is missing in server config")
    
    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + (10 * 60),
        "iss": GITHUB_APP_ID,
    }
    return jwt.encode(payload, GITHUB_PRIVATE_KEY, algorithm="RS256")

def get_installation_access_token(installation_id: int):
    """Exchanges App JWT for an Installation Access Token."""
    jwt_token = get_github_jwt()
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json"
    }
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    response = requests.post(url, headers=headers)
    if response.status_code != 201:
        return None
    return response.json().get("token")

# --- Endpoints ---

@router.get("/install-url")
def install_url(admin_user_id: int = Depends(get_current_user_id)):
    url = f"https://github.com/apps/{GITHUB_APP_SLUG}/installations/new"
    return {"url": url}

@router.post("/finalize")
def finalize_github(
    installation_id: int = Query(..., description="GitHub installation ID"),
    org_id: int = Query(None, description="GitHub organization ID"),
    admin_user_id: int = Depends(get_current_user_id)
):
    conn = get_db()
    cur = conn.cursor()
    try:
        effective_org_id = org_id if org_id is not None else installation_id
        cur.execute(
            """
            INSERT INTO github_installations (admin_user_id, org_id, installation_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (org_id) DO UPDATE
            SET admin_user_id = EXCLUDED.admin_user_id,
                installation_id = EXCLUDED.installation_id
            """,
            (admin_user_id, effective_org_id, installation_id)
        )
        cur.execute("UPDATE users SET github_connected = TRUE WHERE id = %s", (admin_user_id,))
        conn.commit()
        return {"ok": True}
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(500, f"Database error: {e}")
    finally:
        cur.close()
        conn.close()

@router.get("/status")
def github_status(admin_user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT github_connected FROM users WHERE id=%s", (admin_user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return {"connected": row[0] if row else False}

@router.get("/repositories")
def get_repositories(admin_user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("SELECT installation_id FROM github_installations WHERE admin_user_id = %s", (admin_user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return {"repositories": []}

    token = get_installation_access_token(row[0])
    if not token:
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub access token")

    headers = {"Authorization": f"token {token}"}
    # Note: Correct GitHub endpoint for installation repos
    resp = requests.get("https://api.github.com/installation/repositories", headers=headers)
    
    if resp.status_code != 200:
        return {"repositories": []}

    return {"repositories": resp.json().get("repositories", [])}