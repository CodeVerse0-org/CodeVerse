# summaries.py
import jwt
import time
import httpx
import base64
import os
from dotenv import load_dotenv
from fastapi import APIRouter, Query, HTTPException
from utils.summarizer import generate_file_summary

load_dotenv()

router = APIRouter(prefix="/api/repos", tags=["Summaries"])

# Load GitHub App credentials from .env
APP_ID = os.getenv("GITHUB_APP_ID")
PRIVATE_KEY_PATH = os.getenv("GITHUB_PRIVATE_KEY_PATH")

def load_private_key():
    try:
        with open(PRIVATE_KEY_PATH, "r") as f:
            return f.read()
    except Exception as e:
        print("❌ KEY LOAD ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Private key file not found")


def get_github_jwt():
    try:
        private_key = load_private_key()

        payload = {
            "iat": int(time.time()) - 60,
            "exp": int(time.time()) + (10 * 60),
            "iss": APP_ID,
        }

        token = jwt.encode(payload, private_key, algorithm="RS256")
        return token

    except Exception as e:
        print("❌ JWT ERROR:", str(e))
        raise HTTPException(status_code=500, detail="JWT generation failed")


async def get_installation_token(installation_id: int):
    try:
        jwt_token = get_github_jwt()

        headers = {
            "Authorization": f"Bearer {jwt_token}",
            "Accept": "application/vnd.github+json",
        }

        url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers)

        if resp.status_code != 201:
            print("❌ TOKEN ERROR:", resp.text)
            raise HTTPException(status_code=401, detail="GitHub token failed")

        return resp.json()["token"]

    except Exception as e:
        print("❌ INSTALLATION TOKEN ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files")
async def get_repo_files(full_repo: str = Query(...), inst_id: int = Query(...)):
    try:
        token = await get_installation_token(inst_id)
        headers = {"Authorization": f"token {token}"}
        url = f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1"

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)

        if resp.status_code != 200:
            print("❌ TREE ERROR:", resp.text)
            raise HTTPException(status_code=404, detail="Repo not accessible")

        tree = resp.json().get("tree", [])
        valid_exts = ('.js', '.jsx', '.py', '.java', '.tsx', '.cs', '.html', '.css')

        files = [
            {
                "path": f["path"],
                "label": f["path"].split("/")[-1],
                "summary": None
            }
            for f in tree
            if f["type"] == "blob"
            and f["path"].endswith(valid_exts)
            and "node_modules" not in f["path"]
        ]
        return files

    except Exception as e:
        print("❌ FILE FETCH ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize-file")
async def summarize_file(data: dict):
    try:
        repo = data.get("repo_name")
        path = data.get("path")
        inst_id = data.get("inst_id")

        token = await get_installation_token(inst_id)
        headers = {"Authorization": f"token {token}"}
        url = f"https://api.github.com/repos/{repo}/contents/{path}"

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)

        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="File read failed")

        content = base64.b64decode(resp.json()["content"]).decode("utf-8")

        # Use the updated Gemini summarizer
        summary = generate_file_summary(path.split("/")[-1], content)

        return {
            "path": path,
            "label": path.split("/")[-1],
            "summary": summary
        }

    except Exception as e:
        print("❌ SUMMARY ERROR:", str(e))
        return {
            "path": data.get("path", ""),
            "label": data.get("path", "").split("/")[-1],
            "summary": f"PURPOSE: Error\nFEATURES: - {str(e)}"
        }