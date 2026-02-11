import jwt
import time
from config import settings  # <- use settings instance

def generate_app_jwt():
    """
    Generates GitHub App JWT for API authentication.
    """
    private_key = settings.GITHUB_PRIVATE_KEY
    if not private_key:
        raise RuntimeError("GitHub Private Key not loaded. Check your config.")

    payload = {
        "iat": int(time.time()) - 60,
        "exp": int(time.time()) + 600,
        "iss": settings.GITHUB_APP_ID
    }

    token = jwt.encode(payload, private_key, algorithm="RS256")
    return token
