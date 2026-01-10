import jwt
import time
from config import GITHUB_APP_ID, GITHUB_PRIVATE_KEY_PATH

def generate_app_jwt():
    with open(GITHUB_PRIVATE_KEY_PATH, "r") as f:
        private_key = f.read()

    payload = {
        "iat": int(time.time()) - 60,
        "exp": int(time.time()) + 600,
        "iss": GITHUB_APP_ID
    }

    return jwt.encode(payload, private_key, algorithm="RS256")
