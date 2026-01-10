import httpx
from utils.github_auth import generate_app_jwt

async def get_installation_token(installation_id: int):
    jwt_token = generate_app_jwt()

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json"
    }

    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"

    async with httpx.AsyncClient() as client:
        r = await client.post(url, headers=headers)
        r.raise_for_status()
        return r.json()["token"]
