import time
import logging
from jose import jwt
import requests
import httpx
import asyncio
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from db.models import UserRepository
from db.session import get_db as get_sqlalchemy_db
from db.connection import get_db
from utils.security import decode_access_token
from config import settings

# Added to resolve ImportErrors in other routers
async def fetch_file_content(client: httpx.AsyncClient, url: str, headers: dict, semaphore: asyncio.Semaphore):
    """
    Utility function to fetch a single file's content from GitHub API 
    using a semaphore to limit concurrency.
    """
    async with semaphore:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return None
        except Exception as e:
            logging.error(f"Error fetching {url}: {e}")
            return None

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

    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + (9 * 60),
        "iss": settings.GITHUB_APP_ID
    }

    try:
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
            raise HTTPException(
                status_code=resp.status_code,
                detail="GitHub Token Generation Failed"
            )
        return resp.json().get("token")
    except Exception as e:
        logger.error(f"GitHub Auth Error: {str(e)}")
        raise HTTPException(status_code=502, detail="GitHub API Communication Error")


# ---------------- ROUTES ---------------- #

@router.get("/install-url")
def get_install_url(user_id: int = Depends(get_current_user_id)):
    redirect_uri = "http://localhost:5173/github-callback"
    url = f"https://github.com/apps/{GITHUB_APP_SLUG}/installations/new?state={user_id}&redirect_uri={redirect_uri}"
    return {"url": url}

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

@router.post("/finalize")
def finalize_github_connection(
    installation_id: int = Query(...),
    user_id: int = Depends(get_current_user_id)
):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            "DELETE FROM github_installations WHERE admin_user_id=%s",
            (user_id,)
        )

        cur.execute("""
            INSERT INTO github_installations (admin_user_id, org_id, installation_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (org_id) DO UPDATE SET installation_id = EXCLUDED.installation_id
        """, (user_id, installation_id, installation_id))

        cur.execute(
            "UPDATE users SET github_connected=TRUE WHERE id=%s",
            (user_id,)
        )

        conn.commit()

    except Exception as e:
        conn.rollback()
        logger.error(f"Finalize DB Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database save failed")

    finally:
        cur.close()
        conn.close()

    return {"status": "success"}


@router.get("/repositories")
def get_admin_repos(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT installation_id FROM github_installations WHERE admin_user_id=%s",
            (user_id,)
        )
        row = cur.fetchone()

        if not row:
            return {"repositories": []}

        installation_id = row[0]  # ✅ FIXED

        token = get_installation_access_token(installation_id)

        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json"
        }

        resp = requests.get(
            "https://api.github.com/installation/repositories",
            headers=headers,
            timeout=10
        )

        return {
            "repositories": resp.json().get("repositories", [])
            if resp.status_code == 200 else []
        }

    except Exception as e:
        logger.error(f"Fetch Repos Error: {str(e)}")
        return {"repositories": []}

    finally:
        cur.close()
        conn.close()


@router.get("/status")
def github_status(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT github_connected FROM users WHERE id=%s",
            (user_id,)
        )
        row = cur.fetchone()
        return {"connected": bool(row[0]) if row else False}

    finally:
        cur.close()
        conn.close()


@router.delete("/disconnect")
def disconnect_github(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT installation_id FROM github_installations WHERE admin_user_id=%s",
            (user_id,)
        )
        row = cur.fetchone()

        if row:
            installation_id = row[0]  # ✅ FIXED

            jwt_token = get_github_jwt()
            headers = {
                "Authorization": f"Bearer {jwt_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }

            uninstall_url = f"https://api.github.com/app/installations/{installation_id}"

            try:
                resp = requests.delete(uninstall_url, headers=headers, timeout=10)

                # ✅ FIXED ERROR LINE
                if resp.status_code not in (204, 404):
                    logger.error(f"GitHub API Uninstall Failed: {resp.status_code}")

            except Exception as e:
                logger.error(f"Network error: {str(e)}")

            cur.execute(
                "DELETE FROM github_installations WHERE admin_user_id=%s",
                (user_id,)
            )

        cur.execute(
            "UPDATE users SET github_connected=FALSE WHERE id=%s",
            (user_id,)
        )

        conn.commit()

        return {"status": "success", "message": "GitHub disconnected"}

    except Exception as e:
        conn.rollback()
        logger.error(f"Disconnect Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")

    finally:
        cur.close()
        conn.close()