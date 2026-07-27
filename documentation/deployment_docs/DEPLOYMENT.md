# TruthLayer Deployment Guide (Free Tier)

This guide deploys TruthLayer entirely on free tiers.

## Components & free services

| Component  | Service                         | Notes                                   |
| ---------- | ------------------------------- | --------------------------------------- |
| Database   | Supabase **or** Neon            | Postgres + `pgvector`, generous free tier |
| Backend    | Render / Railway / Fly.io       | Docker web service                      |
| Frontend   | Vercel                          | Next.js, zero-config                    |
| LLM + STT  | OpenRouter                      | OpenAI-compatible API key              |
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

> For access to shared production database connection strings, Supabase credentials, or deployment keys, please contact the development team / group maintainers directly.

## 2. LLM + transcription keys (OpenRouter)

1. Create a key at [openrouter.ai](https://openrouter.ai).
2. Set `LLM_API_KEY` or configure OpenRouter variables as needed. All transcription defaults to using the OpenRouter audio models (e.g. Gemini 2.5 Flash Lite).

Embeddings default to a **local** MiniLM model (`EMBEDDINGS_PROVIDER=local`,
`EMBEDDINGS_DIM=384`) so you need no embeddings key. To use OpenAI embeddings
instead, set `EMBEDDINGS_PROVIDER=openai`, the key/base, and `EMBEDDINGS_DIM=1536`
**before first run**.

## 3. Backend (Render)

Production URL: `https://truthlayer-backend-spcp.onrender.com`

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select this repo (uses [`render.yaml`](../../render.yaml)).
3. Verify environment variables in the Render Dashboard:
   * `ENVIRONMENT`: `production`
   * `DATABASE_URL`: `<your-supabase-postgres-connection-string>`
   * `ENCRYPTION_KEY`: `<32-byte-fernet-secret-key>`
   * `SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   * `BACKEND_CORS_ORIGINS`: `https://truthlayer-ashen.vercel.app,http://localhost:3000`
   * `BACKEND_PUBLIC_URL`: `https://truthlayer-backend-spcp.onrender.com`
   * `LLM_MODEL`: `google/gemini-2.5-flash-lite`
   * `EMBEDDINGS_PROVIDER`: `openai`
   * `EMBEDDINGS_DIM`: `1536`
   * `YTDLP_COOKIES_FILE`: `/etc/secrets/cookies.txt` (optional: secret file upload)
4. Deploy. Health check: `GET https://truthlayer-backend-spcp.onrender.com/health` -> `{"status":"ok"}`.

## 4. Frontend (Vercel)

Production URL: `https://truthlayer-ashen.vercel.app`

1. Vercel → **Add New Project** → import repo, set **Root Directory** = `frontend`.
2. Configure Environment Variables in Vercel Project Settings:
   * `NEXT_PUBLIC_API_URL`: `https://truthlayer-backend-spcp.onrender.com`
   * `NEXT_PUBLIC_SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<your-supabase-anon-public-key>`
3. Deploy. Verify login, registration, and analysis dashboard pages.

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
