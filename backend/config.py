import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

    EMAIL_FROM: Optional[str] = os.getenv("EMAIL_FROM")
    EMAIL_APP_PASSWORD: Optional[str] = os.getenv("EMAIL_APP_PASSWORD")

    GITHUB_APP_ID: int = int(os.getenv("GITHUB_APP_ID", 0))
    GITHUB_APP_SLUG: Optional[str] = os.getenv("GITHUB_APP_SLUG")
    GITHUB_WEBHOOK_SECRET: Optional[str] = os.getenv("GITHUB_WEBHOOK_SECRET")
    
    # Declare both the path AND text fields
    GITHUB_PRIVATE_KEY_PATH: Optional[str] = os.getenv("GITHUB_PRIVATE_KEY_PATH")
    GITHUB_PRIVATE_KEY_TEXT: Optional[str] = os.getenv("GITHUB_PRIVATE_KEY_TEXT")

    FRONTEND_URL: str = "https://code-verse-one.vercel.app"

    @property
    def GITHUB_PRIVATE_KEY(self) -> Optional[str]:
        # 1. Check raw text environment variable (Production)
        if self.GITHUB_PRIVATE_KEY_TEXT:
            return self.GITHUB_PRIVATE_KEY_TEXT.strip()
            
        # 2. Fallback to reading file path (Local Development)
        if self.GITHUB_PRIVATE_KEY_PATH and os.path.exists(self.GITHUB_PRIVATE_KEY_PATH):
            with open(self.GITHUB_PRIVATE_KEY_PATH, "r") as f:
                return f.read()

        return None


settings = Settings()