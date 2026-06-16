# TruthLayer Deployment Guide (Free Tier)

This guide deploys TruthLayer entirely on free tiers.

## Components & free services

| Component  | Service                         | Notes                                   |
| ---------- | ------------------------------- | --------------------------------------- |
| Database   | Supabase **or** Neon            | Postgres + `pgvector`, generous free tier |
| Backend    | Render / Railway / Fly.io       | Docker web service                      |
| Frontend   | Vercel                          | Next.js, zero-config                    |
| LLM + STT  | Groq                            | Free `llama-3.3-70b` + `whisper-large-v3` |
| Evidence   | Tavily (optional)               | Free web-search for fact-checking       |
| Redis      | Upstash (optional)              | Only if you enable Celery               |

---

## 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor run: `create extension if not exists vector;`
   (the app also attempts this on startup).
3. Copy the **connection string** (pooler, port 6543 or 5432) and convert it to the
   sync driver form:

   ```
   postgresql+psycopg://postgres:<password>@<host>:5432/postgres
   ```

   Use this as `DATABASE_URL`.

> Neon works identically — copy its connection string and prefix with
> `postgresql+psycopg://`.

## 2. LLM + transcription keys (Groq)

1. Create a key at [console.groq.com](https://console.groq.com).
2. Set:
   ```
   LLM_API_KEY=<groq key>
   LLM_BASE_URL=https://api.groq.com/openai/v1
   LLM_MODEL=llama-3.3-70b-versatile
   WHISPER_API_KEY=<groq key>
   WHISPER_BASE_URL=https://api.groq.com/openai/v1
   WHISPER_MODEL=whisper-large-v3
   ```

Embeddings default to a **local** MiniLM model (`EMBEDDINGS_PROVIDER=local`,
`EMBEDDINGS_DIM=384`) so you need no embeddings key. To use OpenAI embeddings
instead, set `EMBEDDINGS_PROVIDER=openai`, the key/base, and `EMBEDDINGS_DIM=1536`
**before first run**.

## 3. Backend (Render)

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → pick the repo (uses [`render.yaml`](../render.yaml)).
3. Fill the `sync:false` env vars: `DATABASE_URL`, `LLM_API_KEY`, `WHISPER_API_KEY`,
   `TAVILY_API_KEY` (optional), and `BACKEND_CORS_ORIGINS` (your Vercel URL).
4. Deploy. Health check: `GET /health`.

> Free Render web services sleep after inactivity and cold-start in ~30s. The
> first analysis after a sleep includes that wake time. The local-embeddings model
> also downloads (~90MB) on first boot — keep the instance warm or switch to OpenAI
> embeddings to avoid the download on a memory-constrained free dyno.

## 4. Frontend (Vercel)

1. Vercel → **Add New Project** → import the repo, set **Root Directory** = `frontend`.
2. Add env var `NEXT_PUBLIC_API_URL` = your Render backend URL.
3. Deploy. Update the backend's `BACKEND_CORS_ORIGINS` to include the Vercel URL.

## 5. (Optional) Distributed processing with Celery

By default analysis runs in-process (`USE_CELERY=false`) — fine for free tiers.
To scale horizontally:

1. Create an Upstash Redis DB; copy its `rediss://` URL into `REDIS_URL`.
2. Set `USE_CELERY=true`.
3. Run a worker (separate Render background worker, or `docker compose --profile celery up`):
   ```
   celery -A app.tasks.celery_app.celery worker --loglevel=info
   ```

## 6. Local (Docker)

```bash
cp .env.example .env        # fill keys
docker compose up --build   # frontend :3000, backend :8000
# with Celery worker:
docker compose --profile celery up --build
```

## Production hardening checklist

- [ ] Strong random `SECRET_KEY`.
- [ ] Restrict `BACKEND_CORS_ORIGINS` to your real domains.
- [ ] Move uploaded media from local disk to S3/Supabase Storage (see
      `services/ingestion.py`).
- [ ] Use Alembic migrations instead of `create_all` on startup.
- [ ] Put the media-integrity GPU service behind `MEDIA_INTEGRITY_URL`.
- [ ] Add rate limiting + request size limits at the edge.
