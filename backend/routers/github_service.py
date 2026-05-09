import httpx
import orjson

class GitHubService:
    async def fetch_repos(self, token: str):
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json"
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("https://api.github.com/user/repos", headers=headers)
                if response.status_code == 200:
                    return orjson.loads(response.content)
                return []
            except Exception as e:
                print(f"Error fetching GitHub repos: {e}")
                return []

# Create one instance to be used everywhere
github_service = GitHubService()