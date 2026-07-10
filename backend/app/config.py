from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str | None = None
    openai_model: str = "gpt-5.5"
    embedding_model: str = "text-embedding-3-small"
    app_env: str = "development"
    backend_host: str = "127.0.0.1"
    backend_port: int = 8001
    jobfit_backend_mock: bool = False

    @property
    def backend_mock(self) -> bool:
        return self.jobfit_backend_mock


@lru_cache
def get_settings() -> Settings:
    return Settings()
