from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "task-collab API"
    APP_ENV: str = "development"
    DATABASE_URL: str = (
        "postgresql://taskcollab:taskcollab@localhost:5432/taskcollab"
    )
    # Comma-separated list, e.g. "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGINS: str = "http://localhost:3000"

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
