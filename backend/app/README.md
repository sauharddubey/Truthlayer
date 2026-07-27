# Backend Core Package Structure (`backend/app`)

This directory contains the primary backend application code for the TruthLayer platform.

## Module Directory Breakdown

| File / Subdirectory | Technical Function & Description |
| :--- | :--- |
| **`main.py`** | FastAPI application entrypoint, CORS configuration, exception handlers, static route mounts (`/media`), and startup `init_db()` triggering. |
| **`config.py`** | Centralized `pydantic-settings` configuration loading environment variables (single source of truth for backend settings). |
| **`database.py`** | SQLAlchemy engine initialization, session factory (`SessionLocal`), base declarative metadata, and schema migration logic. |
| **`models.py`** | SQLAlchemy ORM database models (`User`, `Organization`, `Product`, `Video`, `Claim`, `AnalysisReport`, `DocumentChunk`, etc.). |
| **`schemas.py`** | Pydantic v2 schemas defining input validation models and response payloads across all API routes. |
| **`security.py`** | Supabase JWT token validation, JWKS key management, password hashing, and role-based access control (`require_roles`). |
| **`crypto.py`** | Symmetric encryption logic (Fernet key handling for stored API keys) and HMAC-signed media URL creation/validation. |
| **`audit.py`** | Structured audit logging engine for recording security events, authentication requests, and resource mutations. |
| **`ratelimit.py`** | In-memory token-bucket rate limiting middleware enforcing request rate caps across client IP addresses. |
| **`urlguard.py`** | Server-Side Request Forgery (SSRF) mitigation and video URL validation against permitted domain allow-lists. |
| **`uploads.py`** | Secure video file upload handling, content-type verification, extension gating, and disk persistence. |
| **`rights.py`** | Permission matrices mapping user roles (`business`, `creator`, `verifier`) to system capabilities and active agent tiers. |
| **`llm.py`** | OpenRouter LLM client interface (`chat_json`, `chat_text`, `embed_texts`), contextvar key management, and usage tracking. |
| **`monitoring.py`** | Continuous hashtag and brand keyword monitoring service. |
| **`agents/`** | Subsystem housing the 11 AI analysis agents and orchestrator engine. |
| **`api/`** | Subsystem housing FastAPI REST API route handlers. |
| **`compliance/`** | Subsystem containing compliance data assets and subprocessor listings. |
| **`rag/`** | Subsystem containing vector storage and pgvector similarity search operations. |
| **`services/`** | Subsystem containing audio processing, transcription, structuring, evidence retrieval, and PDF report creation services. |
| **`tasks/`** | Subsystem containing asynchronous task pipelines and Celery configuration. |

## Core Architectural Guarantees

1. **Configuration Single Source**: No code module may inspect `os.environ` directly; all environment settings are read from `app.config.settings`.
2. **AI Provider Abstraction**: All LLM and embedding requests must pass through `app.llm.py` to maintain key isolation and centralized usage metrics recording.
3. **Database Schema Self-Bootstrapping**: DB schema initialization (`init_db`) executes automatically during application startup, ensuring required vector extensions and tables exist.
