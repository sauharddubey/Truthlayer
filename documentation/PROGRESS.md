# TruthLayer — Progress & Development History

A running log of major milestones, the current state of the system, and the development roadmap. For architectural specifications, see [`documentation.md`](./documentation.md).

---

## Current Subsystem Status

| Area | Status | Implementation Details |
| :--- | :--- | :--- |
| **Core Analysis Pipeline** | [COMPLETED] | Working end-to-end (ingest -> transcribe -> structure -> agents -> fuse score). |
| **Three Role Workspaces** | [COMPLETED] | Tailored dashboard interfaces for Business, Creator, and Verifier roles. |
| **Database Subsystem** | [COMPLETED] | Supabase PostgreSQL + `pgvector` extension enabled. |
| **Authentication & RBAC** | [COMPLETED] | Supabase Auth (email/password + Google OAuth) with backend JWKS verification. |
| **Per-User OpenRouter Keys**| [COMPLETED] | Keys stored encrypted at rest via Fernet symmetric encryption and injected via contextvars. |
| **Security & Hardening** | [COMPLETED] | URL Guard SSRF prevention, signed media links, audit logging, rate limiting. |
| **Codebase Refactoring** | [COMPLETED] | Removed obsolete auth endpoints, updated client bindings, enforced type safety. |
| **Automated Test Suite** | [COMPLETED] | Pytest test suite covering hardening, RAG, ingestion, claims, and scoring. |

---

## Milestone History

### M1 — Database Migrated to Supabase
- Migrated default connection configuration from local Docker Postgres to Supabase PostgreSQL.
- Resolved IPv6 routing constraints by routing through the Supabase Session Pooler (`postgresql+psycopg://...?sslmode=require`).
- Provisioned baseline schema dynamically via `init_db()` (vector extension, document chunks with `vector(1536)`).

### M2 — Authentication Subsystem Modernization
- Replaced legacy auth handlers with Supabase Auth (GoTrue ES256 tokens).
- Integrated frontend bindings (`lib/supabase.ts`), user signup role bootstrap (`POST /auth/bootstrap`), and OAuth redirect callbacks (`/auth/callback`).
- Configured backend verification (`app/security.py`) to fetch JWKS keys dynamically and prevent algorithm confusion attacks.

### M3 — Enterprise Hardening & Security Controls
- Added Fernet symmetric key encryption for sensitive API keys at rest.
- Implemented time-limited HMAC URL signing (`app/crypto.py`) for media file serving (`/media/{filename}?exp=&sig=`).
- Integrated URL Guard (`app/urlguard.py`) for SSRF protection during video ingestion.
- Added in-memory token-bucket rate limiting (`app/ratelimit.py`) and audit logging (`app/audit.py`).
- Implemented background retention policies (`app/tasks/retention.py`) to automatically clean up temporary video artifacts.
