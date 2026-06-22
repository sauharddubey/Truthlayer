# TruthLayer — Progress Guide

A running log of major milestones, the current state of the system, and the
roadmap. For how things work, see [`documentation.md`](./documentation.md).

---

## Current status

| Area | State |
| ---- | ----- |
| Core analysis pipeline | ✅ Working (ingest → transcribe → structure → agents → score) |
| Three role experiences (Business / Creator / Verifier) | ✅ Working |
| Database | ✅ Migrated to **Supabase Postgres** (+ pgvector) |
| Authentication | ✅ **Supabase Auth** (email/password + Google), backend JWKS verification |
| Per-user OpenRouter keys | ✅ Required, **encrypted at rest**, in-app entry, system gated until set |
| Security hardening | ✅ Encryption, JWT pinning, tenant isolation, signed media, CORS, error hygiene |
| Codebase cleanup | ✅ Dead auth code/files/deps removed |
| Rate limiting on analysis endpoints | ⬜ Recommended follow-up |
| Automated test suite | ⬜ Not yet established |

---

## Milestone log

### M1 — Database migrated to Supabase
- Repointed `DATABASE_URL` from the local Docker Postgres to **Supabase Postgres**.
- Resolved the IPv6-only direct-connection issue by using the **Session pooler**
  (IPv4, port 5432, `postgresql+psycopg://…?sslmode=require`).
- Provisioned the full schema on Supabase via `init_db()` (15 tables, `vector`
  extension, `document_chunks.embedding` = `vector(1536)`). Started fresh (empty).
- `docker-compose.yml` now reads `DATABASE_URL` from the root `.env`; the backend
  no longer depends on the local `db` container.

### M2 — Authentication moved to Supabase (full replacement)
- Replaced the previous custom JWT + Google-Identity-Services auth with
  **Supabase Auth** (email/password + Google OAuth), as a full replacement.
- Frontend: `lib/supabase.ts` client; `lib/api.ts` login/register/OAuth via
  Supabase; `GoogleAuthButton` (Supabase OAuth) replacing the GIS button;
  `/auth/callback` route for the OAuth redirect.
- Backend: `app/security.py` verifies Supabase JWTs and **JIT-provisions** a
  local profile keyed by the Supabase user id. New `POST /auth/bootstrap`
  applies the role/org chosen at sign-up. Removed `/auth/register`, `/auth/login`,
  `/auth/google`.
- The project uses Supabase's modern **asymmetric JWT signing keys (ES256)**, so
  verification is done against the project **JWKS** (no shared HS256 secret).

### M3 — Per-user OpenRouter keys, required & gated
- Each user enters their own OpenRouter key in Settings; the system blocks
  analysis until a key is set:
  - Backend: `_require_api_key` guards `/videos/url`, `/videos/upload`,
    `/analysis/start` (403 with a clear message when no key).
  - Frontend: `ApiKeyGate` shows a blocking "Connect OpenRouter" modal (inline
    key entry) on every authenticated page until a key exists.

### M4 — Security hardening + full cleanup
Security fixes (all verified):
- **C1** — OpenRouter keys **encrypted at rest** (Fernet, `app/crypto.py`);
  decrypted only at point-of-use; never serialized to clients.
- **C2** — JWT **algorithm-confusion** closed: algorithm pinned to the trusted
  JWKS key (not the token header), HS256 path removed, `exp` required, `aud`
  verified.
- **C3** — **IDOR** fixed: `list_documents` / `list_keywords` now enforce product
  ownership and scope by `organization_id`.
- **H1** — Open `/media` static mount replaced with **short-lived signed URLs**
  (`app/api/media.py`); product image URLs signed at serialization.
- **H2** — Upload **type/extension allow-list** + `video/*` content-type check.
- **M1** — CORS **fail-closed** (no wildcard-with-credentials fallback).
- **M2** — Generic client errors; full exception detail to server logs only.
- **H3 (partial)** — Business LLM endpoints (contradictions, brand synthesis) now
  use the requesting user's key, not the platform key.

Cleanup:
- Deleted dead files: `services/google_oauth.py`, and frontend `GoogleButton`,
  `MacMock`, `ScoreCard`, `VideoTable`, `visuals`.
- Removed dead schemas (`Token`, `RegisterRequest`, `GoogleLoginRequest`), dead
  config (`SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`,
  `GOOGLE_CLIENT_ID`, `SUPABASE_JWT_SECRET`), unused imports, and the orphaned
  Google Identity Services script.
- Pruned dead dependencies: `passlib`, `bcrypt`, `google-auth`, `tiktoken`,
  `alembic`.

### M6 — All API keys are per-user (no keys in env)
- Moved every external-service key out of the environment and into per-user
  Settings (encrypted at rest): **OpenRouter** (required), **Tavily**,
  **Whisper**, **media-integrity**. New `users` columns + migration.
- `llm.py` runtime context extended with Tavily/Whisper/media-integrity keys;
  `effective_chat_key()` now requires a per-user key (no env fallback).
- Consumers rewired to the per-user runtime keys: `evidence.py` (Tavily),
  `transcription.py` (Whisper), `media_integrity.py`.
- Settings UI gained optional Tavily/Whisper/media-integrity key fields.
- `.env` / `.env.example` cleaned to hold **only** shared infra + non-secret
  model/provider config (base URLs, model names, dims) — zero API keys.

### M5 — Documentation
- Added this `documentation/` folder: technical reference + this progress guide.
- Updated `.env.example` into a clearly-annotated "universal" env template
  (shared infra vs per-user keys).

---

## How verification was done

- Backend: `python -m compileall app`, import checks, image rebuild, container
  restart, `/health` 200, `/auth/me` 401 without a token.
- Auth: ES256 token verified end-to-end against JWKS; negative cases
  (missing `exp`, wrong `aud`, expired, tampered) all rejected.
- Crypto: encrypt ≠ plaintext, decrypt round-trips, garbage → None.
- Media: valid signed URL → 200; unsigned / bad-sig / expired → 403; traversal → 404.
- Frontend: `tsc --noEmit` clean; all routes return 200.

---

## Known follow-ups / roadmap

| Priority | Item | Notes |
| -------- | ---- | ----- |
| High | **Rate limiting** on analysis endpoints | DoS/abuse hardening; needs a Redis-backed limiter to be correct across workers. Pipeline cost already falls on each user's own key. |
| High | **Rotate the shared DB password** | The current one was shared in chat during setup — rotate in Supabase → Settings → Database. |
| Medium | **Automated tests** | No suite yet — add API/auth/pipeline tests + CI. |
| Medium | **Schema migrations tool** | Schema is bootstrapped via `init_db()` raw SQL; consider Alembic for production change management. |
| Low | **Real media-integrity backend** | `media_integrity` agent is a heuristic stub; wire a GPU service via `MEDIA_INTEGRITY_URL`. |
| Low | **Embeddings provider** | Confirm `EMBEDDINGS_*` configuration matches the deployed model dimension (`EMBEDDINGS_DIM`). |

---

## Onboarding a new contributor (TL;DR)

1. `cp .env.example .env` and fill **shared infra** values: `SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`,
   `ENCRYPTION_KEY` (generate one). `cp frontend/.env.local.example frontend/.env.local`.
2. `docker compose up --build` (or run backend + frontend individually).
3. Ensure Supabase Auth providers (Email, Google) + redirect URLs are configured.
4. Sign up in the app, then add **your own** OpenRouter key in Settings — you do
   not share LLM keys; each person uses their own.
