"""Central configuration loaded from environment variables.

Every external dependency (DB, Redis, LLM, embeddings, transcription, evidence
retrieval, media-integrity) is configured here so the rest of the codebase never
reads ``os.environ`` directly. This is what makes TruthLayer provider-agnostic and
free-tier friendly: swap a base URL / key and nothing else changes.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── Core ──────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    ALGORITHM: str = "HS256"
    # Comma-separated list of allowed origins (kept as a plain string so env
    # parsing never tries to JSON-decode it). Use `.cors_origins` for the list.
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    # ── Google OAuth ──────────────────────────────────────────────────────
    # The OAuth 2.0 Web Client ID from Google Cloud Console. Used to verify the
    # ID token (credential) the frontend obtains via Google Identity Services.
    GOOGLE_CLIENT_ID: str = ""

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/truthlayer"

    # ── Redis / Celery ────────────────────────────────────────────────────
    REDIS_URL: str = ""
    USE_CELERY: bool = False

    # ── LLM (OpenRouter — OpenAI-compatible) ──────────────────────────────
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://openrouter.ai/api/v1"
    LLM_MODEL: str = "openai/gpt-oss-120b:free"
    LLM_TEMPERATURE: float = 0.1
    # Optional OpenRouter attribution headers (shown on your OpenRouter dashboard).
    LLM_HTTP_REFERER: str = "https://truthlayer.app"
    LLM_APP_TITLE: str = "TruthLayer"

    # ── Embeddings ────────────────────────────────────────────────────────
    EMBEDDINGS_PROVIDER: str = "openai"  # local | openai
    EMBEDDINGS_API_KEY: str = ""
    EMBEDDINGS_BASE_URL: str = "https://openrouter.ai/api/v1"
    EMBEDDINGS_MODEL: str = "openai/text-embedding-3-small"
    EMBEDDINGS_DIM: int = 1536

    # ── Transcription ─────────────────────────────────────────────────────
    # "openrouter": transcribe via an audio-input chat model using the LLM key
    #               (audio requires a small OpenRouter credit balance).
    # "whisper":    transcribe via an OpenAI-compatible /audio/transcriptions
    #               endpoint (Groq serves whisper-large-v3 free).
    # "stub":       deterministic placeholder transcript (no key needed).
    TRANSCRIPTION_PROVIDER: str = "openrouter"
    # Audio-capable OpenRouter model used when provider == "openrouter".
    TRANSCRIPTION_MODEL: str = "google/gemini-2.5-flash-lite"
    WHISPER_API_KEY: str = ""
    WHISPER_BASE_URL: str = "https://api.groq.com/openai/v1"
    WHISPER_MODEL: str = "whisper-large-v3"

    # ── Evidence retrieval ────────────────────────────────────────────────
    TAVILY_API_KEY: str = ""

    # ── Media integrity ───────────────────────────────────────────────────
    MEDIA_INTEGRITY_URL: str = ""
    MEDIA_INTEGRITY_API_KEY: str = ""

    # ── Storage ───────────────────────────────────────────────────────────
    MEDIA_STORAGE_DIR: str = "/tmp/truthlayer/media"
    MAX_UPLOAD_MB: int = 200

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def celery_enabled(self) -> bool:
        return self.USE_CELERY and bool(self.REDIS_URL)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
