# TruthLayer Backend

FastAPI service implementing ingestion, transcription, transcript structuring, the
multi-agent analysis pipeline, RAG, and reporting.

## Run locally (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env        # then edit ../.env
uvicorn app.main:app --reload     # http://localhost:8000/docs
```

By default (`USE_CELERY=false`) analysis runs in-process via FastAPI
`BackgroundTasks` — no Redis/worker needed. This is the free-tier path.

## With Celery (distributed processing)

```bash
# set USE_CELERY=true and REDIS_URL in .env, then:
celery -A app.tasks.celery_app.celery worker --loglevel=info
# optional periodic keyword monitoring:
celery -A app.tasks.celery_app.celery beat --loglevel=info
```

## Layout

```
app/
├── main.py            FastAPI app + router wiring
├── config.py          env-driven settings (provider-agnostic)
├── database.py        SQLAlchemy engine/session + pgvector bootstrap
├── models.py          ORM models (full SRS schema)
├── schemas.py         Pydantic request/response models
├── security.py        JWT, password hashing, RBAC
├── llm.py             OpenAI-compatible chat + embeddings (local fallback)
├── monitoring.py      continuous keyword monitoring
├── api/               auth, videos, business, dashboard, reports routers
├── agents/            fact_check, bias, sentiment, compliance, creator_risk,
│                      media_integrity, narrative, orchestrator
├── rag/store.py       document parse/chunk/embed + tenant-scoped retrieval
├── services/          ingestion (yt-dlp), transcription (OpenRouter audio), structuring,
│                      evidence (tavily), reports (pdf)
└── tasks/             pipeline + celery app
```

## Notes

- **No keys?** The system still runs end-to-end: transcription, LLM agents, and
  evidence retrieval fall back to deterministic stubs, and embeddings use a local
  MiniLM model. Add keys in `.env` to unlock real analysis.
- `EMBEDDINGS_DIM` must match the embedding model. If you switch from the local
  MiniLM (384) to OpenAI `text-embedding-3-small` (1536), update `EMBEDDINGS_DIM`
  **before** first run (it defines the pgvector column width).
