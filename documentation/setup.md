# TruthLayer — Setup Guide

Step-by-step setup from a fresh `git clone`, for your own machine. By the end you
will have the backend, frontend, and a Supabase project running, and you'll be
signed in with your own OpenRouter key.

> New here? Read this top to bottom once. For how the system works, see
> [`documentation.md`](./documentation.md); for project status, see
> [`PROGRESS.md`](./PROGRESS.md).

---

## 1. Prerequisites

You need either **Docker** (easiest — runs everything) **or** the local toolchain.

**Option A — Docker (recommended)**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes `docker compose`)
- `git`

**Option B — Run locally without Docker**
- `git`
- **Python 3.11** + `pip`
- **Node.js 18+** + `npm`
- **ffmpeg** (required by `yt-dlp` for audio extraction)
  - macOS: `brew install ffmpeg` · Ubuntu: `sudo apt install ffmpeg`

You will also need (free) accounts:
- **[Supabase](https://supabase.com)** — database + auth.
- **[OpenRouter](https://openrouter.ai/keys)** — your personal LLM key (entered in the app, not in env).
- *(optional)* **[Google Cloud](https://console.cloud.google.com)** — only if you want Google sign-in.

---

## 2. Clone the repo

```bash
git clone <your-repo-url> TruthLayer
cd TruthLayer
```

---

## 3. Create a Supabase project

1. Create a new project at [supabase.com](https://supabase.com) and set a
   **database password** (save it).
2. From the dashboard, collect three things (**Project → Settings → API**):
   - **Project URL** → `https://<project-ref>.supabase.co`
   - **anon / public key**
   - *(no JWT secret needed — the backend verifies tokens via the project JWKS)*
3. Get the **database connection string** (**Project → Connect → Session pooler**).
   Use the **Session pooler** (IPv4), not the direct connection. It looks like:
   ```
   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
   Convert it to the SYNC driver form the app expects and add SSL:
   ```
   postgresql+psycopg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
   ```

> The database **schema is created automatically** on first backend startup
> (`init_db()` creates the `vector` extension + all tables). No manual migration.

---

## 4. Configure Supabase Auth

In the Supabase dashboard:

1. **Authentication → Providers → Email**: enabled. For instant local login,
   turn **off "Confirm email"** (otherwise new users must confirm via email).
2. **Authentication → Providers → Google** *(optional — only for Google sign-in)*:
   enable and paste your Google OAuth **Client ID + Secret**. In Google Cloud
   Console, set the authorized redirect URI to:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/callback`

---

## 5. Create your env files

### Root `.env` (backend + shared config)

```bash
cp .env.example .env
```

Fill in these **required** values (everything else can keep its default):

```dotenv
ENVIRONMENT=development
BACKEND_CORS_ORIGINS=http://localhost:3000

# Generate with the command below — keep it secret and STABLE.
ENCRYPTION_KEY=<your-fernet-key>

SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-public-key>

DATABASE_URL=postgresql+psycopg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

Generate an encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> ⚠️ Keep `ENCRYPTION_KEY` stable — if it changes, previously stored user keys
> become unreadable and users must re-enter them.

### Frontend `frontend/.env.local`

```bash
cp frontend/.env.local.example frontend/.env.local
```

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-public-key>
```

> Note on keys: there are **no API keys in env at all**. Each user adds their own
> service keys in the app (Settings) — OpenRouter (required), and optionally
> Tavily / media-integrity — all encrypted at rest. The `LLM_*` /
> `EMBEDDINGS_*` entries in env are just base URLs + model names.

---

## 6. Run the app

### Option A — Docker (recommended)

```bash
make up
# or: docker compose up --build
```

This starts Postgres-less infra (Redis) + the backend + frontend. With Redis
present, analysis runs via Celery; otherwise the backend uses in-process
background tasks. To also run the Celery worker explicitly:

```bash
make up-celery
```

### Option B — Run locally (two terminals)

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload          # or: make backend (from repo root)

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                            # or: make frontend (from repo root)
```

---

## 7. First run

1. Open **http://localhost:3000**.
2. Backend API docs are at **http://localhost:8000/docs**; health at
   **http://localhost:8000/health**.
3. **Register** an account (pick a role: Business / Creator / Verifier) or sign in
   with Google.
4. You'll be prompted by the **"Connect OpenRouter"** gate — paste your own key
   from [openrouter.ai/keys](https://openrouter.ai/keys). Analysis is blocked
   until a key is set. (Get a free one if you don't have it.)
5. Submit a public video URL or upload a file and watch the analysis run.

---

## 8. Verify it's working

```bash
# backend up?
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/health      # expect 200

# auth enforced?
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/auth/me     # expect 401 (no token)

# frontend up?
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login       # expect 200
```

On first backend startup you should see `Application startup complete` and the
Supabase tables get created automatically.

---

## 9. Common setup issues

| Symptom | Fix |
| ------- | --- |
| `No address associated with hostname` connecting to the DB | You used the IPv6-only **direct** connection. Switch to the **Session pooler** host (`...pooler.supabase.com`). |
| Login works but every API call returns 401 | Check `SUPABASE_URL` is correct and the backend can reach the project JWKS. |
| `Unsupported provider: provider is not enabled` | Enable the **Google** provider in the Supabase dashboard (§4). |
| Sign-up says "check your inbox" and you can't log in | Disable **Confirm email** in Supabase (Auth → Providers → Email), or click the confirmation link. |
| "Connect OpenRouter" modal won't go away | Expected — add your OpenRouter key in Settings; this is the key gate. |
| Port 3000/8000 already in use | Stop the other process, or change the published ports in `docker-compose.yml`. |
| ffmpeg / audio extraction errors (local run) | Install **ffmpeg** (`brew install ffmpeg` / `apt install ffmpeg`). |
| Stale UI after pulling changes | Hard refresh (`Cmd/Ctrl+Shift+R`) or unregister the service worker in DevTools. |

---

## 10. Useful commands

```bash
make up         # docker compose up --build
make down       # stop & remove containers
make logs       # tail all container logs
make backend    # run backend locally (uvicorn --reload)
make frontend   # run frontend locally (next dev)
make worker     # run a Celery worker locally
make test       # run backend tests
```

---

That's it. For deeper detail on the architecture, data model, API, and security,
continue to [`documentation.md`](./documentation.md).
