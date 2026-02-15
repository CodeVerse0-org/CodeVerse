import time
import logging
from jose import jwt
import requests
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from db.models import UserRepository
from db.session import get_db as get_sqlalchemy_db
from db.connection import get_db
from utils.security import decode_access_token
from config import settings

# Configure logging to see the actual error in console
logger = logging.getLogger(__name__)

GITHUB_APP_ID = settings.GITHUB_APP_ID
GITHUB_PRIVATE_KEY = settings.GITHUB_PRIVATE_KEY
GITHUB_APP_SLUG = settings.GITHUB_APP_SLUG

router = APIRouter(tags=["GitHub"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user_id(token: str = Depends(oauth2_scheme)):
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(user_id)
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_github_jwt():
    if not settings.GITHUB_PRIVATE_KEY:
        raise HTTPException(status_code=500, detail="GitHub Private Key missing")
    
    # Get current time
    now = int(time.time())
    
    payload = {
        # Issued at time: 60 seconds in the past to allow for clock drift
        "iat": now - 60,
        # Expiration time: 9 minutes from now (Total 10 mins from iat)
        # GitHub allows max 10 minutes total.
        "exp": now + (9 * 60), 
        # GitHub App ID
        "iss": settings.GITHUB_APP_ID
    }
    
    try:
        # Ensure key is formatted correctly
        private_key = settings.GITHUB_PRIVATE_KEY.replace("\\n", "\n").strip()
        return jwt.encode(payload, private_key, algorithm="RS256")
    except Exception as e:
        logger.error(f"JWT Encoding Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to encode GitHub JWT")

def get_installation_access_token(installation_id: int):
    jwt_token = get_github_jwt()
    headers = {
        "Authorization": f"Bearer {jwt_token}", 
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    
    try:
        resp = requests.post(url, headers=headers, timeout=10)
        if resp.status_code != 201:
            logger.error(f"GitHub Token Error: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"GitHub API Error: {resp.json().get('message')}")
        return resp.json().get("token")
    except requests.RequestException as e:
        logger.error(f"Request to GitHub failed: {str(e)}")
        raise HTTPException(status_code=502, detail="Gateway error communicating with GitHub")

# -----------------------------
# Endpoints
# -----------------------------

@router.get("/install-url")
def get_install_url(user_id: int = Depends(get_current_user_id)):
    redirect_uri = "http://localhost:5173/github-callback"
    url = f"https://github.com/apps/{GITHUB_APP_SLUG}/installations/new?state={user_id}&redirect_uri={redirect_uri}"
    return {"url": url}

@router.post("/finalize")
def finalize_github_connection(
    installation_id: int = Query(...),
    user_id: int = Depends(get_current_user_id)
):
    conn = get_db()
    cur = conn.cursor()
    try:
        # Assuming org_id is unique per installation context
        cur.execute("""
            INSERT INTO github_installations (admin_user_id, org_id, installation_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (org_id) DO UPDATE SET installation_id = EXCLUDED.installation_id
        """, (user_id, installation_id, installation_id))
        
        cur.execute("UPDATE users SET github_connected=TRUE WHERE id=%s", (user_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"DB Error in finalize: {str(e)}")
        raise HTTPException(status_code=500, detail="Database persistence failed")
    finally:
        cur.close()
        conn.close()
    return {"status": "success", "installation_id": installation_id}

@router.get("/status")
def github_status(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT github_connected FROM users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        return {"connected": row[0] if row else False}
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return {"connected": False}
    finally:
        cur.close()
        conn.close()

@router.get("/repositories")
def get_admin_repos(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT installation_id FROM github_installations WHERE admin_user_id=%s", (user_id,))
        row = cur.fetchone()
        if not row:
            return {"repositories": []}

        installation_id = row[0]
        token = get_installation_access_token(installation_id)
        
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json"
        }
        
        resp = requests.get("https://api.github.com/installation/repositories", headers=headers, timeout=10)
        
        if resp.status_code != 200:
            logger.warning(f"Failed to fetch repos: {resp.status_code}")
            return {"repositories": []}

        return {"repositories": resp.json().get("repositories", [])}
    except Exception as e:
        logger.error(f"Error in get_admin_repos: {str(e)}")
        # Instead of 500, we return an empty list to keep frontend stable, 
        # or re-raise if you want strict error reporting
        raise HTTPException(status_code=500, detail="Internal processing error while fetching repositories")
    finally:
        cur.close()
        conn.close()

@router.get("/developer/repos")
def get_developer_repos(
    db: Session = Depends(get_sqlalchemy_db),
    user_id: int = Depends(get_current_user_id)
):
    # 1. Get assigned repositories from SQLAlchemy
    assigned = db.query(UserRepository).filter_by(user_id=user_id).all()
    if not assigned:
        return []

    # 2. Get installation ID (Using simple connection for this part)
    conn = get_db()
    cur = conn.cursor()
    inst = None
    try:
        cur.execute("SELECT installation_id FROM github_installations ORDER BY id DESC LIMIT 1")
        inst = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not inst or not inst[0]:
        return []

    installation_id = inst[0]
    
    try:
        token = get_installation_access_token(installation_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json"
        }

        results = []
        for a in assigned:
            try:
                resp = requests.get(
                    f"https://api.github.com/repositories/{a.repo_id}",
                    headers=headers,
                    timeout=5
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results.append({
                        "repo_id": a.repo_id,
                        "repo_name": data.get("name"),
                        "full_name": data.get("full_name"),
                        "html_url": data.get("html_url"),
                        "installation_id": installation_id
                    })
            except Exception:
                continue 
        return results
    except Exception as e:
        logger.error(f"Developer repo fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching developer repositories")