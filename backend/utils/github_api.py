import httpx
from utils.github_auth import generate_app_jwt

GITHUB_API = "https://api.github.com"

async def get_installation_token(installation_id: int):
    jwt_token = generate_app_jwt()
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json"
    }
    url = f"{GITHUB_API}/app/installations/{installation_id}/access_tokens"

    async with httpx.AsyncClient() as client:
        r = await client.post(url, headers=headers)
        r.raise_for_status()
        return r.json()["token"]

async def get_repo_tree(owner: str, repo: str, installation_id: int):
    token = await get_installation_token(installation_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    }
    url = f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"

    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers)
        r.raise_for_status()
        data = r.json()

    files = [
        f for f in data.get("tree", [])
        if f["type"] == "blob"
        and not f["path"].startswith("node_modules")
        and f["path"].endswith((".js", ".jsx", ".ts", ".tsx"))
    ]
    return files

async def get_file_content(owner: str, repo: str, path: str, installation_id: int):
    token = await get_installation_token(installation_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    }
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"

    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers)
        r.raise_for_status()
        data = r.json()

    import base64
    return base64.b64decode(data["content"]).decode("utf-8")
