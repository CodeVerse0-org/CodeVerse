import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):

    DATABASE_URL: str = os.getenv("DATABASE_URL")

    EMAIL_FROM: str = os.getenv("EMAIL_FROM")
    EMAIL_APP_PASSWORD: str = os.getenv("EMAIL_APP_PASSWORD")

    GITHUB_APP_ID: int = int(os.getenv("GITHUB_APP_ID", 0))
    GITHUB_APP_SLUG: str = os.getenv("GITHUB_APP_SLUG")
    GITHUB_WEBHOOK_SECRET: str = os.getenv("GITHUB_WEBHOOK_SECRET")
    GITHUB_PRIVATE_KEY_PATH: str = os.getenv("GITHUB_PRIVATE_KEY_PATH")
    FRONTEND_URL: str = "https://code-verse-one.vercel.app"
    @property
    def GITHUB_PRIVATE_KEY(self) -> str:
        # 1. Check if the raw text environment variable is provided directly (Production)
        if self.GITHUB_PRIVATE_KEY_TEXT:
            return self.GITHUB_PRIVATE_KEY_TEXT.strip()
            
        # 2. Fallback to reading the file path (Local Development)
        if self.GITHUB_PRIVATE_KEY_PATH and os.path.exists(self.GITHUB_PRIVATE_KEY_PATH):
            with open(self.GITHUB_PRIVATE_KEY_PATH, "r") as f:
                return f.read()
        return None


settings = Settings()