import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:hello123@localhost:5432/codeverse_db"
    )
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "rida.fatima42525@gmail.com")
    EMAIL_APP_PASSWORD: str = os.getenv("EMAIL_APP_PASSWORD", "kdth rpyg vhbf ggbw")

    GITHUB_APP_ID: int = int(os.getenv("GITHUB_APP_ID", 0))
    GITHUB_APP_SLUG: str = os.getenv("GITHUB_APP_SLUG", "codeverse-tool")
    GITHUB_WEBHOOK_SECRET: str = os.getenv("GITHUB_WEBHOOK_SECRET", "")
    GITHUB_PRIVATE_KEY_PATH: str = os.getenv("GITHUB_PRIVATE_KEY_PATH", "")

    @property
    def GITHUB_PRIVATE_KEY(self):
        if self.GITHUB_PRIVATE_KEY_PATH and os.path.exists(self.GITHUB_PRIVATE_KEY_PATH):
            with open(self.GITHUB_PRIVATE_KEY_PATH, "r") as f:
                return f.read()
        else:
            print(f"CRITICAL ERROR: GitHub Private Key file not found at {self.GITHUB_PRIVATE_KEY_PATH}")
            return None

settings = Settings()
print("Using DATABASE_URL:", settings.DATABASE_URL)

