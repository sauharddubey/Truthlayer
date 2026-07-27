# TruthLayer Backend Subsystem

FastAPI backend service implementing video ingestion, audio extraction, multimodal transcription, transcript structuring, the parallel multi-agent analysis fleet, pgvector RAG retrieval, security controls, and PDF report generation.

---

## Directory Architecture

```
backend/
├── Dockerfile              Container build configuration for FastAPI service
├── README.md               Backend subsystem architecture and execution guide
├── requirements.txt        Pinned Python dependencies
├── app/                    Core FastAPI backend package
│   ├── main.py             FastAPI entrypoint, middleware, CORS, static mounts
│   ├── config.py           Single source of truth environment settings
│   ├── database.py         SQLAlchemy engine, session factory, and schema migrations
│   ├── models.py           SQLAlchemy ORM data models and enumerations
│   ├── schemas.py          Pydantic v2 schemas for API requests and responses
│   ├── security.py         Supabase JWT authentication and RBAC dependencies
│   ├── crypto.py           Fernet symmetric key encryption and signed URL helpers
│   ├── audit.py            Structured audit logging engine
│   ├── ratelimit.py        Token-bucket rate limiting middleware and memory stores
│   ├── urlguard.py         SSRF prevention and video URL domain validation
│   ├── uploads.py          Video file upload validation and disk storage
│   ├── rights.py           Role capabilities, tier permissions, and agent mapping
│   ├── llm.py              OpenRouter LLM chat, embeddings, and contextvar key handling
│   ├── monitoring.py       Continuous keyword and hashtag monitoring engine
│   ├── agents/             Fleet of 11 specialized AI analysis agents
│   ├── api/                FastAPI REST router modules
│   ├── compliance/         Subprocessor registry and compliance assets
│   ├── rag/                PostgreSQL pgvector storage and similarity search
│   ├── services/           Background processing services (ingest, transcribe, struct, PDF)
│   └── tasks/              Celery worker configuration and pipeline task flows
└── tests/                  Automated unit, integration, and hardening test suite
```

---

## Technical Specifications

### 1. In-Process & Asynchronous Pipeline Execution
* **Default Mode (`USE_CELERY=false`)**: Pipeline execution runs asynchronously within the FastAPI process using `BackgroundTasks`. No external Redis broker is required for single-node deployments.
* **Distributed Mode (`USE_CELERY=true`)**: Pipeline execution is dispatched to Celery workers backed by a Redis message broker for horizontal scaling.

### 2. Multi-Agent Threading & Per-User API Keys
* AI calls are executed in parallel using `concurrent.futures.ThreadPoolExecutor`.
* Python `contextvars` (`set_runtime_api_key`) ensure that the submitting user's decrypted OpenRouter API key is safely propagated to worker threads without cross-request leakages.

### 3. Security & Access Control
* **JWKS Verification**: Supabase JWT access tokens are validated against Supabase Published JWKS endpoint using ES256 signature verification.
* **Data Encryption**: Per-user API keys stored in `users.openrouter_api_key` are encrypted at rest via Fernet symmetric encryption.
* **URL Guard**: Prevents SSRF attacks by enforcing strict domain allow-lists (YouTube, TikTok, Instagram) and resolving IP addresses before making HTTP requests.

---

## Local Execution & Development Setup

### Virtual Environment Execution

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize environment variables
cp ../.env.example ../.env

# Launch FastAPI development server
uvicorn app.main:app --reload --port 8000
```

### Docker Execution

```bash
# Build backend container from root directory
docker compose build backend

# Run backend container
docker compose up backend
```

---

## Executing the Test Suite

```bash
# Run all tests using pytest
pytest -q

# Run specific security hardening tests
pytest tests/test_hardening.py -v
```
