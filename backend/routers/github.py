import time
import logging
from jose import jwt
import httpx
import asyncio
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from db.models import UserRepository, GitHubInstallation, User
from db.session import get_db as get_sqlalchemy_db
from utils.security import decode_access_token
from config import settings

logger = logging.getLogger(__name__)

GITHUB_APP_ID = settings.GITHUB_APP_ID
GITHUB_PRIVATE_KEY = settings.GITHUB_PRIVATE_KEY
GITHUB_APP_SLUG = settings.GITHUB_APP_SLUG

router = APIRouter(tags=["GitHub"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Utility function for concurrent file fetching across modules
async def fetch_file_content(client: httpx.AsyncClient, url: str, headers: dict, semaphore: asyncio.Semaphore):
    async with semaphore:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return None
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return int(user_id)
    except Exception as e:
        logger.error(f"Auth validation error: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_github_jwt() -> str:
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

def get_installation_access_token(installation_id: int) -> str:
    jwt_token = get_github_jwt()

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"

    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.post(url, headers=headers)

            if resp.status_code != 201:
                logger.error(f"GitHub Token Generation Failed ({resp.status_code}): {resp.text}")
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"GitHub API Error: {resp.text}"
                )

            token = resp.json().get("token")
            if not token:
                raise HTTPException(status_code=500, detail="GitHub did not return an access token.")

            return token

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("GitHub Token Request Failed")
        raise HTTPException(status_code=502, detail=f"GitHub API Communication Error: {str(e)}")

# ---------------- ROUTES ---------------- #

@router.get("/install-url")
def get_install_url(user_id: int = Depends(get_current_user_id)):
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    redirect_uri = f"{settings.FRONTEND_URL}/github-connect-callback"

    url = (
        f"https://github.com/apps/{GITHUB_APP_SLUG}"
        f"/installations/new?state={user_id}&redirect_uri={redirect_uri}"
    )

    return {"url": url}
@router.get("/developer/repos")
def get_developer_repos(
    db: Session = Depends(get_sqlalchemy_db),
    user_id: int = Depends(get_current_user_id)
):
    assigned = db.query(UserRepository).filter_by(user_id=user_id).all()
    if not assigned:
        return []

    # Group repositories by their managing admin_id
    admin_repos = {}
    for a in assigned:
        admin_repos.setdefault(a.admin_id, []).append(a.repo_id)

    results = []
    with httpx.Client(timeout=10.0) as client:
        for admin_id, repo_ids in admin_repos.items():
            inst = db.query(GitHubInstallation).filter_by(admin_user_id=admin_id).first()
            if not inst:
                continue

            try:
                token = get_installation_access_token(inst.installation_id)
                headers = {
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github+json"
                }

                for repo_id in repo_ids:
                    resp = client.get(f"https://api.github.com/repositories/{repo_id}", headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        results.append({
                            "repo_id": repo_id,
                            "repo_name": data.get("name"),
                            "full_name": data.get("full_name"),
                            "html_url": data.get("html_url"),
                            "installation_id": inst.installation_id,
                            "admin_id": admin_id
                        })
            except Exception as e:
                logger.error(f"Error fetching repos for admin {admin_id}: {e}")
                continue

    return results

@router.post("/finalize")
def finalize_github_connection(
    installation_id: int = Query(...),
    db: Session = Depends(get_sqlalchemy_db),
    user_id: int = Depends(get_current_user_id)
):
    try:
        # Fetch or create the specific installation for THIS admin
        existing_inst = db.query(GitHubInstallation).filter_by(admin_user_id=user_id).first()
        
        if existing_inst:
            existing_inst.installation_id = installation_id
            existing_inst.org_id = installation_id
        else:
            new_inst = GitHubInstallation(
                admin_user_id=user_id,
                org_id=installation_id,
                installation_id=installation_id
            )
            db.add(new_inst)

        # Mark user as connected
        user = db.query(User).filter_by(id=user_id).first()
        if user:
            user.github_connected = True

        db.commit()
        return {"status": "success"}

    except Exception as e:
        db.rollback()
        logger.error(f"Finalize GitHub Connection Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save GitHub installation record")

@router.get("/repositories")
def get_admin_repos(
    db: Session = Depends(get_sqlalchemy_db),
    user_id: int = Depends(get_current_user_id)
):
    inst = db.query(GitHubInstallation).filter_by(admin_user_id=user_id).first()

    if not inst:
        return {"repositories": []}

    token = get_installation_access_token(inst.installation_id)

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json"
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                "https://api.github.com/installation/repositories",
                headers=headers
            )

        if resp.status_code != 200:
            logger.error(f"GitHub Repositories Error ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text)

        data = resp.json()
        return {"repositories": data.get("repositories", [])}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Fetch Repositories Exception")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
def github_status(
    db: Session = Depends(get_sqlalchemy_db),
    user_id: int = Depends(get_current_user_id)
):
    user = db.query(User).filter_by(id=user_id).first()
    return {"connected": user.github_connected if user else False}

@router.delete("/disconnect")
def disconnect_github(
    db: Session = Depends(get_sqlalchemy_db),
    user_id: int = Depends(get_current_user_id)
):
    try:
        # 1. Remove ONLY this admin's database record
        inst = db.query(GitHubInstallation).filter_by(admin_user_id=user_id).first()
        if inst:
            db.delete(inst)

        # 2. Update user status
        user = db.query(User).filter_by(id=user_id).first()
        if user:
            user.github_connected = False

        db.commit()
        return {"status": "success", "message": "GitHub disconnected locally"}

    except Exception as e:
        db.rollback()
        logger.error(f"Disconnect Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operation failed")
