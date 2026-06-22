# TruthLayer — Technical Documentation

> AI-powered trust, compliance, and media-intelligence platform for video. It
> ingests a video (upload or public URL), transcribes it, structures the
> transcript into claims, runs a fleet of specialized AI agents in parallel
> against a RAG knowledge layer, and produces explainable, citation-backed
> reports for three audiences: **Business**, **Creator**, and **Verifier**.

This document is the single technical reference for the app: architecture, data
model, auth, the analysis pipeline, the API surface, the security model, and how
to configure and run it. For the chronological build history and roadmap, see
[`PROGRESS.md`](./PROGRESS.md).

---

## 1. Table of contents

1. [System overview](#2-system-overview)
2. [Tech stack](#3-tech-stack)
3. [Repository layout](#4-repository-layout)
4. [Architecture & request flow](#5-architecture--request-flow)
5. [Authentication (Supabase)](#6-authentication-supabase)
6. [User roles & capabilities](#7-user-roles--capabilities)
7. [The analysis pipeline](#8-the-analysis-pipeline)
8. [AI agents](#9-ai-agents)
9. [Data model](#10-data-model)
10. [API reference](#11-api-reference)
11. [Security model](#12-security-model)
12. [Environment & configuration](#13-environment--configuration)
13. [Running locally](#14-running-locally)
14. [Deployment](#15-deployment)
15. [Troubleshooting](#16-troubleshooting)

---

## 2. System overview

```
Video Upload / URL
   → Ingestion (yt-dlp / file)      → Audio extraction
   → Transcription                  → Transcript structuring (claims)
   → Embedding & indexing (pgvector)
   → Parallel AI agents             → RAG retrieval → evidence fusion
   → Scoring & confidence
   → Dashboards + Reports (JSON/PDF)
```

Every AI call goes through one OpenAI-compatible client (OpenRouter by default),
so models can be swapped via configuration without code changes. Each **user
brings their own OpenRouter API key**, entered in the app and encrypted at rest;
their analyses run on their own key and usage is tracked per user.

---

## 3. Tech stack

| Layer          | Technology |
| -------------- | ---------- |
| Frontend       | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts |
| Backend        | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Auth           | Supabase Auth (GoTrue) — email/password + Google OAuth; ES256 JWTs verified via JWKS |
| Database       | Supabase PostgreSQL + `pgvector` |
| Async jobs     | Celery + Redis (optional) with in-process `BackgroundTasks` fallback |
| AI / LLM       | OpenAI-compatible Chat + Embeddings (OpenRouter) |
| Transcription  | OpenRouter audio model · stub fallback |
| Ingestion      | `yt-dlp` (YouTube / TikTok / Instagram public URLs) |
| Encryption     | `cryptography` (Fernet) for secrets at rest + signed media URLs |

---

## 4. Repository layout

```
TruthLayer/
├── backend/                 FastAPI service
│   └── app/
│       ├── main.py          App entrypoint, CORS, router wiring
│       ├── config.py        Settings (env-driven)
│       ├── database.py      Engine, session, schema bootstrap (init_db)
│       ├── models.py        SQLAlchemy ORM models (all tables)
│       ├── schemas.py       Pydantic request/response models
│       ├── security.py      Supabase JWT verification + JIT user provisioning
│       ├── crypto.py        Fernet encryption + signed media URLs
│       ├── rights.py        Role → capabilities & agent tiers
│       ├── llm.py           OpenAI-compatible LLM/embeddings client + usage tracking
│       ├── api/             Route handlers (auth, videos, products, dashboard, reports, media)
│       ├── agents/          AI agents + orchestrator
│       ├── rag/             pgvector store + retrieval
│       ├── services/        ingestion, transcription, structuring, evidence, reports
│       └── tasks/           Celery app + the analysis pipeline
├── frontend/                Next.js app
│   ├── app/                 Routes (login, register, dashboards, settings, analysis…)
│   ├── components/          UI components
│   └── lib/                 api client + supabase client
├── docker-compose.yml
├── .env.example             Universal env template (copy → .env)
├── documentation/           ← this folder
└── docs/                    Deployment notes + requirements traceability
```

---

## 5. Architecture & request flow

1. **Frontend (Next.js)** authenticates the user with **Supabase** (client-side),
   receiving a Supabase access token (JWT). The API client attaches it as a
   `Bearer` token on every backend request.
2. **Backend (FastAPI)** verifies the token against the Supabase project's
   published **JWKS** and resolves/creates the local user profile.
3. A user submits a video (`/videos/url` or `/videos/upload`). The backend
   stores a `Video` row and enqueues processing — via **Celery** if Redis is
   configured, otherwise an in-process **BackgroundTask**.
4. The **pipeline** runs ingestion → transcription → structuring → parallel
   agents → scoring, writing claims, evidence, and an `AnalysisReport`.
5. The frontend polls `/analysis/{video_id}` and renders the dashboard/report.

---

## 6. Authentication (Supabase)

Auth is fully delegated to Supabase. The backend stores **no passwords** and
issues **no tokens**.

**Sign-up / sign-in (frontend, `lib/api.ts` + `lib/supabase.ts`):**
- Email/password → `supabase.auth.signUp` / `signInWithPassword`.
- Google → `supabase.auth.signInWithOAuth({ provider: 'google' })` → redirect to
  `/auth/callback` → session established → role/org applied → dashboard.
- The chosen role (business/creator/verifier) is captured at sign-up and applied
  to the profile via `POST /auth/bootstrap`.

**Token verification (backend, `app/security.py`):**
- The Supabase access token is an **ES256** JWT.
- `get_current_user` reads the `kid` from the token header, fetches the matching
  public key from the project **JWKS** (cached, `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`),
  and verifies with the algorithm declared by that **trusted key** — not the
  token header (prevents algorithm-confusion). `exp` is required and `aud`
  (`authenticated`) is verified.
- On first authenticated request, a local `users` row is **JIT-provisioned**,
  keyed by the Supabase user id (`sub`). Business users also get an `Organization`.

**Required Supabase dashboard configuration:**
- Authentication → Providers → **Email** (and disable "Confirm email" for instant
  local login if desired).
- Authentication → Providers → **Google** (add Google OAuth client ID + secret;
  Google Console redirect URI = `https://<ref>.supabase.co/auth/v1/callback`).
- Authentication → URL Configuration → Site URL `http://localhost:3000`, and add
  redirect URL `http://localhost:3000/auth/callback`.

---

## 7. User roles & capabilities

Defined in `app/rights.py`. Each role maps to a tier that selects the agent set.

| Role | Purpose | Agents run | Extra capabilities |
| ---- | ------- | ---------- | ------------------ |
| **Business** | Brand/product monitoring, compliance, narrative intelligence | fact_check, perception, bias, sentiment, compliance, media_integrity | Products workspace, compliance KB (RAG), hashtag monitoring, brand overview |
| **Creator** | Pre-publication self-check of own videos | perception, sentiment, bias, fact_check, creator_risk | — |
| **Verifier** | Fact-check any public video | fact_check | — |

A `content` classifier always runs first; agents then run in parallel.

---

## 8. The analysis pipeline

`app/tasks/pipeline.py` (`process_video`). Status transitions are persisted on
the `Video` row (`processing_status`):

| Stage | Status | What happens |
| ----- | ------ | ------------ |
| 0 | — | Idempotent reset: clear prior artifacts for re-processing |
| 1. Ingestion | `INGESTING` | Resolve URL / read upload; extract audio (`services/ingestion.py`) |
| 2. Transcription | `TRANSCRIBING` | Speech → text (`services/transcription.py`) |
| 3. Structuring | `STRUCTURING` | Transcript → semantic claims; embed + index in pgvector |
| 4. Agents + fusion + scoring | `ANALYZING` | Run tier's agents in parallel, fuse evidence, compute scores |
| ✓ | `COMPLETED` | Write `AnalysisReport`; invalidate brand-synthesis cache |
| ✗ | `FAILED` | Store a **generic** error message (full detail to server logs only) |

The submitting user's OpenRouter key is decrypted and set as the per-request
runtime key before any LLM calls, so all work bills that user's key and usage is
attributed to them.

---

## 9. AI agents

Located in `app/agents/`, coordinated by `orchestrator.py` (runs selected agents
concurrently in a thread pool, each with its own context copy).

| Agent | Role |
| ----- | ---- |
| `content` | Classifies the video/topic (runs first) |
| `fact_check` | Extracts claims, retrieves evidence (Tavily), assigns verdicts + confidence |
| `verification` | Cross-checks/normalizes verification status |
| `perception` | How the content will be perceived by an audience |
| `sentiment` | Sentiment / tone scoring |
| `bias` | Bias and narrative-leaning detection |
| `compliance` | Checks claims against the product's compliance KB (business) |
| `creator_risk` | Reputational/"cancellation" risk for creators |
| `media_integrity` | Deepfake / celebrity-detection (heuristic stub by default; pluggable GPU backend) |
| `narrative` | Clusters claims into narrative themes across videos |

---

## 10. Data model

SQLAlchemy models in `app/models.py`. Tenancy is enforced by `organization_id`
(business) and `submitted_by` (personal). The schema is bootstrapped on startup
by `init_db()` (creates the `vector` extension, all tables, and idempotent
additive migrations) — there is no separate migration tool.

| Table | Purpose |
| ----- | ------- |
| `organizations` | Tenant/workspace for business accounts |
| `users` | Local profile keyed by the Supabase user id; role, org, **encrypted** OpenRouter key, per-user model choices |
| `products` | Business products (name, image, aliases) |
| `videos` | Submitted videos + processing status/mode |
| `transcripts` | Transcribed text per video |
| `claims` | Structured claims with verdict/confidence/timestamps/evidence |
| `compliance_issues` | Compliance findings per video |
| `deepfake_results` | Media-integrity (deepfake) results |
| `celebrity_detections` | Celebrity-detection results |
| `narrative_clusters` | Narrative themes across a product's videos |
| `analysis_reports` | Per-video scores (trust/risk/compliance/bias/sentiment…) + summary |
| `business_documents` | Uploaded compliance/marketing docs (RAG source) |
| `document_chunks` | Embedded chunks (`vector(1536)`) for RAG retrieval |
| `monitored_keywords` | Hashtags/brand terms monitored per product |
| `usage_records` | Per-user token & cost usage for every LLM/embedding/transcription call |

---

## 11. API reference

All routes require a valid Supabase `Bearer` token unless noted. Base URL is the
backend (`http://localhost:8000`). Interactive docs at `/docs`.

### Auth & profile (`/auth`)
| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/auth/bootstrap` | Apply role/org chosen at sign-up to the profile |
| GET  | `/auth/me` | Current user profile (`has_api_key` boolean — never the key itself) |
| GET  | `/auth/rights` | Capabilities for the current role |
| PUT  | `/auth/settings` | Set OpenRouter key (encrypted) + model selections |
| GET  | `/auth/usage` | Token & cost usage summary (per-model + 30-day series) |

### Videos & analysis
| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/videos/url` | Submit a public video URL for analysis *(requires API key)* |
| POST | `/videos/upload` | Upload a video file *(requires API key; whitelisted types)* |
| GET  | `/videos/{video_id}` | Video metadata/status (ownership-scoped) |
| POST | `/analysis/start` | (Re)start analysis for a video *(requires API key)* |
| GET  | `/analysis/{video_id}` | Full analysis: video + report + claims |

### Products (business only)
| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/products` · GET `/products` · GET/DELETE `/products/{pid}` | Product CRUD |
| POST | `/products/{pid}/image` | Upload product image |
| POST/GET | `/products/{pid}/documents` | Compliance docs (RAG) — ownership-scoped |
| POST/GET | `/products/{pid}/keywords` | Monitored hashtags — ownership-scoped |
| GET | `/products/{pid}/videos` · `/overview` · `/contradictions` | Product analytics |
| POST | `/products/{pid}/narratives/recompute` | Recompute narrative clusters |
| PUT | `/products/claims/{claim_id}/review` | Approve/reject a claim |

### Dashboards (`/dashboard`)
| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/dashboard/creator` · `/dashboard/verifier` · `/dashboard/brand` | Role dashboards |
| POST | `/dashboard/brand/keywords` | Add a brand-level monitored keyword |

### Reports & media
| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/reports/{video_id}/json` · `/reports/{video_id}/pdf` | Export report |
| GET | `/media/{filename}?exp=&sig=` | Serve uploaded media — **only with a valid signed URL** |

### System
| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Liveness + config flags |

---

## 12. Security model

| Area | Control |
| ---- | ------- |
| **Secrets at rest** | Per-user OpenRouter keys are encrypted with **Fernet** (`app/crypto.py`) before storage; decrypted only at point-of-use in the pipeline. `/auth/me` exposes only a `has_api_key` boolean — never the key. |
| **Auth** | Supabase ES256 JWTs verified via JWKS; algorithm pinned to the trusted key (no alg-confusion); `exp` required, `aud` verified. |
| **Tenant isolation** | Every data route scopes by `organization_id` (business) or `submitted_by` (personal). Cross-tenant id access (IDOR) is blocked, including document/keyword listings. |
| **Media** | No open static mount. Files are served only via **short-lived, HMAC-signed URLs**; tampered/expired/unsigned requests get 403. |
| **Uploads** | Video uploads are validated against an extension allow-list + `video/*` content-type; stored under unguessable UUID names; size-capped (`MAX_UPLOAD_MB`). |
| **CORS** | Fail-closed — explicit allow-list via `BACKEND_CORS_ORIGINS`; never a wildcard with credentials. |
| **Error handling** | Internal exceptions are logged server-side; clients receive a generic message (no stack traces / internal paths). |
| **Secrets in git** | `.env*` files are gitignored; only `.env.example` placeholders are committed. |

**Operational notes:** keep `ENCRYPTION_KEY` stable and secret (rotating it makes
existing encrypted keys unreadable — users must re-enter). Rate limiting on the
expensive analysis endpoints is a recommended follow-up (see PROGRESS.md).

---

## 13. Environment & configuration

`.env.example` is the **universal** template — copy it to `.env` and fill in
values. `.env` is gitignored. There are two kinds of secrets:

**A. Shared / infrastructure (in `.env`, same for everyone on an environment):**

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `ENVIRONMENT` | yes | `development` \| `production` |
| `BACKEND_CORS_ORIGINS` | yes | Comma-separated allowed origins |
| `ENCRYPTION_KEY` | yes | Fernet key — encrypts user secrets + signs media URLs |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon (public) key |
| `DATABASE_URL` | yes | Supabase Postgres (Session pooler, `postgresql+psycopg://…?sslmode=require`) |
| `REDIS_URL` / `USE_CELERY` | no | Enable Celery worker; otherwise BackgroundTasks |
| `LLM_*`, `EMBEDDINGS_*`, `TRANSCRIPTION_*` (base URLs + model names) | no | **Non-secret** model/provider config — **no keys** |
| `MEDIA_INTEGRITY_URL` | no | External GPU deepfake service endpoint (key is per-user) |
| `MEDIA_STORAGE_DIR` / `MAX_UPLOAD_MB` | no | Local media storage + upload cap |
| `NEXT_PUBLIC_API_URL` | yes | Frontend → backend base URL |

> The env file holds **no API keys** — only base URLs, model names, and
> dimensions. `ENCRYPTION_KEY` must be the **same value across every instance**,
> because per-user keys are encrypted with it and stored in the shared DB.

**B. Per-user (NOT in env):** each user enters their **own service API keys** in
the app's Settings page — **OpenRouter** (required: chat + embeddings +
transcription), and optionally **Tavily** (fact-check search), and **media-integrity**. All are encrypted at rest
and used only for that user's analyses. Contributors never share keys.

> Generate an encryption key:
> `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

The frontend's dev server reads `frontend/.env.local` (template:
`frontend/.env.local.example`). In Docker Compose, the backend reads the root
`.env` via `env_file`.

---

## 14. Running locally

> For a complete, first-time, from-clone walkthrough (Supabase project creation,
> auth config, env files, verification), follow [`setup.md`](./setup.md). The
> quick version:

```bash
# 1. Configure
cp .env.example .env                 # fill in Supabase + DATABASE_URL + ENCRYPTION_KEY
cp frontend/.env.local.example frontend/.env.local   # NEXT_PUBLIC_* for `npm run dev`

# 2a. Everything via Docker
docker compose up --build
#   Frontend  http://localhost:3000
#   Backend   http://localhost:8000/docs

# 2b. Or run pieces individually
#   Backend:  cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
#   Frontend: cd frontend && npm install && npm run dev
```

The database schema is created automatically on backend startup (`init_db`).
Before login works, configure the Supabase Auth providers + redirect URLs
(see §6). Each user then adds their OpenRouter key in Settings before running
analyses.

---

## 15. Deployment

See [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) and `render.yaml`. Free-tier map:

| Component | Service |
| --------- | ------- |
| Database  | Supabase (Postgres + pgvector) |
| Auth      | Supabase Auth |
| Redis     | Upstash (optional) |
| Backend   | Render / Railway / Fly.io |
| Frontend  | Vercel |

Production checklist: set a strong `ENCRYPTION_KEY` (and keep it stable), set
`ENVIRONMENT=production`, set explicit `BACKEND_CORS_ORIGINS`, use the Supabase
**Session pooler** connection string, and configure Supabase redirect URLs for
your deployed frontend domain.

---

## 16. Troubleshooting

| Symptom | Cause / fix |
| ------- | ----------- |
| `No address associated with hostname` (DB) | Using the IPv6-only direct connection. Use the **Session pooler** host (IPv4). |
| Login succeeds but API calls 401 | Backend can't verify the token — check `SUPABASE_URL` and that the project JWKS is reachable. |
| `Unsupported provider: provider is not enabled` | Enable the Google provider in the Supabase dashboard. |
| Blocking "Connect OpenRouter" modal | Expected — add your OpenRouter key in Settings; analysis is gated until then. |
| `Invalid or expired media link` (403) | Media is only served via signed URLs from API responses; don't construct `/media/...` URLs by hand. |
| Stale UI after a change | Service worker / browser cache — hard refresh (`Cmd+Shift+R`) or unregister the SW. |
