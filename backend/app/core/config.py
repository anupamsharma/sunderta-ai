from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    api_port: int = 8000
    frontend_port: int = 3000

    mongodb_url: str = "mongodb://mongo:27017"
    mongodb_database: str = "sunderta_ai"
    redis_url: str = "redis://redis:6379/0"

    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = "https://india-west-az-ai.openai.azure.com/"
    azure_openai_deployment: str = "gpt-5.4"
    azure_openai_chat_deployment: str = "gpt-5.4"
    azure_openai_api_version: str = "2024-12-01-preview"

    upload_root: str = "/data/uploads"
    max_image_size_mb: int = 15
    max_video_size_mb: int = 100
    max_video_duration_seconds: int = 30
    media_retention_days: int = 30

    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    rq_queue_name: str = "skin_analysis"
    job_timeout_seconds: int = 600
    max_job_retries: int = 2

    admin_password: str = "okokchangeme123"
    session_secret: str = "dev-session-secret-change-me"
    session_ttl_days: int = 30
    # empty = auto from X-Forwarded-Proto / request scheme
    cookie_secure: str = ""

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_image_bytes(self) -> int:
        return self.max_image_size_mb * 1024 * 1024

    @property
    def max_video_bytes(self) -> int:
        return self.max_video_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
