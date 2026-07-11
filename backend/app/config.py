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
    # Comma-separated list of allowed origins (kept as a plain string so env
    # parsing never tries to JSON-decode it). Use `.cors_origins` for the list.
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    # Fernet key (urlsafe base64, 32 bytes) used to encrypt secrets at rest
    # (per-user OpenRouter keys) and to sign short-lived media URLs. Generate with
    # `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
    ENCRYPTION_KEY: str = ""

    # ── Supabase Auth ─────────────────────────────────────────────────────
    # Auth is delegated to Supabase (GoTrue). The frontend signs users in and
    # receives a Supabase JWT; the backend verifies it against the project's
    # published JWKS (asymmetric ES256/RS256) and JIT-provisions a local profile
    # row keyed by the Supabase user id.
    SUPABASE_URL: str = ""           # e.g. https://<ref>.supabase.co
    SUPABASE_JWT_AUDIENCE: str = "authenticated"

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/truthlayer"

    # ── Redis / Celery ────────────────────────────────────────────────────
    REDIS_URL: str = ""
    USE_CELERY: bool = False

    # NOTE: external-service API keys are NOT configured here. Every key
    # (OpenRouter, Tavily, media-integrity) is supplied per-user in the
    # app's Settings, stored encrypted, and applied per-request. Only non-secret
    # config (base URLs, model names, dimensions) lives in the environment.

    # ── LLM (OpenRouter — OpenAI-compatible) ──────────────────────────────
    LLM_BASE_URL: str = "https://openrouter.ai/api/v1"
    LLM_MODEL: str = "openai/gpt-oss-120b:free"
    LLM_TEMPERATURE: float = 0.1
    # Optional OpenRouter attribution headers (shown on your OpenRouter dashboard).
    LLM_HTTP_REFERER: str = "https://truthlayer.app"
    LLM_APP_TITLE: str = "TruthLayer"

    # ── Embeddings ────────────────────────────────────────────────────────
    # Served by OpenRouter using the user's OpenRouter key (provider="openai").
    EMBEDDINGS_PROVIDER: str = "openai"  # local | openai
    EMBEDDINGS_BASE_URL: str = "https://openrouter.ai/api/v1"
    EMBEDDINGS_MODEL: str = "openai/text-embedding-3-small"
    EMBEDDINGS_DIM: int = 1536

    # ── Transcription ─────────────────────────────────────────────────────
    # "openrouter": transcribe via an audio-input chat model (user's OpenRouter key).
    # "stub":       deterministic placeholder transcript (no key needed).
    TRANSCRIPTION_PROVIDER: str = "openrouter"
    TRANSCRIPTION_MODEL: str = "google/gemini-2.5-flash-lite"

    # ── Media integrity ───────────────────────────────────────────────────
    # Provider adapter: "hive" enables Hive deepfake detection (business tier).
    # The API key is per-user in Settings; only non-secret config lives here.
    MEDIA_INTEGRITY_PROVIDER: str = ""
    MEDIA_INTEGRITY_URL: str = "https://api.thehive.ai/api/v3/hive/ai-generated-and-deepfake-content-detection"
    # Public base URL of this API (required so Hive can fetch signed /media/... links).
    BACKEND_PUBLIC_URL: str = ""

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
