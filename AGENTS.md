# AGENTS.md — TruthLayer

Guidance for AI agents (and humans) working in this repo. Read this before making
changes. Keep it up to date when architecture or conventions change.

---

## What this is

**TruthLayer** is an AI trust, compliance & media-intelligence platform for video.
It transcribes a video, structures the transcript, runs a fleet of AI agents
(fact-check, perception, bias, sentiment, compliance, creator-risk, media-integrity,
narrative), and produces an explainable, evidence-backed report.

### Three user categories (this is the core model — keep it to exactly three)
- **business** — Products workspace. Each product has its own videos, compliance
  knowledge base (product details + marketing policies), hashtag monitoring,
  narrative intelligence, and a brand overview. Claims are verified against the
  product's uploaded docs (auto-verify / needs-review / contradicted).
- **creator** — Pre-publication self-check of their own uploads: facts, perception
  ("could this offend / is it wrong / how will it land"), tone, bias.
- **verifier** — AI fact-checker: every claim evaluated with evidence + a trust verdict.

---

## Architecture

| Layer        | Tech |
| ------------ | ---- |
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind |
| Backend      | FastAPI + SQLAlchemy + Pydantic v2 |
| DB           | PostgreSQL + `pgvector` |
| Async        | Celery + Redis (optional; default runs inline via FastAPI BackgroundTasks) |
| All AI       | **OpenRouter** (OpenAI-compatible) — chat, embeddings, and audio transcription |
| Ingestion    | `yt-dlp` (YouTube / TikTok / Instagram) |

### Repo layout
```
backend/app/
  main.py            FastAPI app, router wiring, /media static mount, startup init_db
  config.py          env settings (single source of truth; never read os.environ elsewhere)
  database.py        engine/session + init_db (create_all + additive idempotent migrations)
  models.py          ORM models + enums (UserRole/ProcessingStatus/AnalysisMode)
  rights.py          the 3 categories: formats, capabilities, which agents run per tier
  llm.py             OpenRouter chat/embeddings + PER-USER key via contextvar
  security.py        JWT, password hashing, require_roles RBAC
  schemas.py         Pydantic request/response models
  api/               auth, videos, products, dashboard, reports routers
  agents/            content, fact_check, perception, bias, sentiment, compliance,
                     creator_risk, media_integrity, verification, narrative, orchestrator
  services/          ingestion (yt-dlp), transcription (OpenRouter audio), structuring,
                     evidence (tavily), reports (pdf), google_oauth
  rag/store.py       parse/chunk/embed docs + tenant+product-scoped pgvector retrieval
  tasks/             pipeline (ingest→transcribe→structure→agents→fuse→report) + celery

frontend/
  app/               App Router pages: / (editorial landing), login, register, settings,
                     analyze, analysis/[id], products, products/[id], dashboard/{brand,creator,verifier}
  components/        AppShell (sidebar), HeroScroll, PhoneMock, visuals, motion, icons,
                     ScoreCard, VideoTable, ClaimsPanel, EvidencePanel, TranscriptPanel, GoogleButton
  lib/api.ts         API client + token storage + routeForRole + mediaUrl helper
  tailwind.config.ts design tokens; globals.css component classes + animations
```

---

## The analysis pipeline (`backend/app/tasks/pipeline.py` → `agents/orchestrator.py`)
1. Set the submitting user's OpenRouter key for the run (falls back to default).
2. Clear prior results for the video (re-processing is idempotent).
3. Ingest (yt-dlp) → Transcribe (OpenRouter audio, timestamped segments) → Structure.
4. Business: auto-identify the product from title/captions/transcript.
5. `content` agent runs first (classifies product vs not, labels each segment safe/verify/risky).
6. `rights.agents_for_tier(tier)` selects the parallel agents; they run in a
   `ThreadPoolExecutor` where each task runs inside `contextvars.copy_context()` so
   the per-user API key propagates to worker threads.
7. Business: `verification.verify_claims` checks claims against product docs (RAG).
8. Fuse scores + persist `AnalysisReport` (everything also stored in `agent_results` JSON).

---

## Conventions
- **All AI goes through `app/llm.py`** (`chat_json`, `chat_text`, `embed_texts`) and
  `services/transcription.py`. Never call OpenAI/OpenRouter SDK directly elsewhere.
  These read the per-user key via the `_runtime_api_key` contextvar; set it with
  `set_runtime_api_key()` at the start of a run.
- **Config only via `app/config.py`** (`settings`). Add new env vars there + to `.env.example`.
- **Tenant isolation**: business data is scoped by `organization_id` and `product_id`.
  RAG retrieval and queries must respect this.
- **Agents** return a JSON-serializable dict that always includes `evidence` and
  `confidence`. They must degrade gracefully (return a sensible default) if the LLM
  is unavailable — a single agent failure must never crash the pipeline.
- **No emojis in the UI** — use the SVG icon set in `components/icons.tsx`.
- **Frontend fonts**: `Inter` (body/UI), `Anton` (`font-heavy`, big display headings),
  `Fraunces` (`font-display`, available but the landing uses Anton). Palette is the
  Notion-style tokens in `tailwind.config.ts` (`ink`, `paper`, `surface`, `line`,
  `accent`, `good`/`warn`/`bad`). Keep status colors consistent.
- **Two UIs, on purpose**: the marketing landing (`app/page.tsx`) is an editorial,
  scroll-animated, Wizz-style showpiece; the authenticated app (`AppShell`) is a clean,
  minimal Notion-style workspace. Don't blur them.

---

## Running locally
```bash
cp .env.example .env          # fill keys (OpenRouter key already wired for dev)
# Backend + DB (Redis optional):
docker compose up --build -d db redis backend     # http://localhost:8000/docs
# Frontend (dev):
cd frontend && npm install && npm run dev          # http://localhost:3000
```
Health: `GET http://localhost:8000/health`.

### Environment
- `LLM_*` → OpenRouter chat (`openai/gpt-oss-120b:free` is the free default).
- `EMBEDDINGS_*` → OpenRouter `openai/text-embedding-3-small` (1536-dim) or local MiniLM.
- `TRANSCRIPTION_PROVIDER=openrouter` (audio via `google/gemini-2.5-flash-lite`);
  `whisper` (Groq) or `stub` are alternatives.
- Per-user keys: set in the app's Settings page (`PUT /auth/settings`), stored on `User`.

---

## ⚠️ Gotchas (we hit these — don't repeat)
- **Never run `npm run build` while the dev server is running.** `next build`
  overwrites the shared `.next/` dir and the running dev server starts serving
  unstyled HTML. To verify, use `npx tsc --noEmit` + the preview, not a full build.
  If CSS breaks: stop dev server, `rm -rf frontend/.next`, restart.
- **`yt-dlp` must stay recent** — YouTube breaks old versions (symptom: "Requested
  format is not available" / only images). `requirements.txt` pins `yt-dlp>=2025.6.0`.
- **Pydantic-settings + list env vars**: don't type an env-backed setting as `List[...]`
  (it tries to JSON-parse the string and crashes). Use a `str` + a property that splits
  (see `BACKEND_CORS_ORIGINS` / `cors_origins`).
- **Enum/schema changes need a DB reset**: `create_all` does NOT alter existing tables
  or Postgres enums. For new *columns*, add an idempotent `ALTER TABLE ... ADD COLUMN
  IF NOT EXISTS` to `database.init_db`. For enum/structural changes in dev, run
  `docker compose down -v` to recreate the volume.
- **Re-analysis must stay idempotent** — `_clear_previous_results` deletes prior
  transcript/claims/issues/report before a re-run (one report per video is unique).
- **OpenRouter**: chat has free models; **embeddings and audio require credits**.
  With a 0-credit key, transcription falls back to a stub and embeddings fall back to
  local. The dev key is funded.
- **NEXT_PUBLIC_* are build-time** in Next. For Docker, pass them as build args (see
  `frontend/Dockerfile` + `docker-compose.yml`); for dev they come from `frontend/.env.local`.

---

## Verifying changes
- Backend: `cd backend && python3 -m compileall -q app` then rebuild the container.
- Frontend: `cd frontend && npx tsc --noEmit` and view via the preview/dev server.
- Smoke tests: `cd backend && python -m pytest -q` (offline, no DB/keys needed).

---

## Docs
- `docs/REQUIREMENTS_TRACEABILITY.md` — SRS requirement → code mapping.
- `docs/DEPLOYMENT.md` — free-tier deployment (Supabase/Neon, Render, Vercel, OpenRouter).
- `README.md`, `backend/README.md`, `frontend/README.md`.
