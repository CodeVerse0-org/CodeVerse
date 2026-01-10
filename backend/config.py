import os
from dotenv import load_dotenv

load_dotenv()

# App identity
GITHUB_APP_ID = int(os.getenv("GITHUB_APP_ID"))
GITHUB_APP_SLUG = "codeverse-tool"

# Secrets and Keys
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")
GITHUB_PRIVATE_KEY_PATH = os.getenv("GITHUB_PRIVATE_KEY_PATH")

# READ THE ACTUAL KEY CONTENT FROM THE .PEM FILE
GITHUB_PRIVATE_KEY = None
if GITHUB_PRIVATE_KEY_PATH and os.path.exists(GITHUB_PRIVATE_KEY_PATH):
    with open(GITHUB_PRIVATE_KEY_PATH, "r") as f:
        GITHUB_PRIVATE_KEY = f.read()
else:
    print(f"CRITICAL ERROR: GitHub Private Key file not found at {GITHUB_PRIVATE_KEY_PATH}")