# TruthLayer Frontend

Next.js 14 (App Router) + Tailwind + Recharts. Three dashboards (business / creator
/ viewer), a video-submission flow, and an explainable analysis page with live
polling, score cards, sentiment timeline, claims and per-agent evidence panels.

## Run locally

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev                         # http://localhost:3000
```

## Deploy (Vercel — free tier)

1. Import the `frontend/` directory as a Vercel project.
2. Set `NEXT_PUBLIC_API_URL` to your deployed backend URL.
3. Deploy. Vercel auto-detects Next.js.

## Pages

```
app/
├── page.tsx                 landing
├── login / register         auth
├── analyze                  submit URL or upload
├── analysis/[id]            live results + evidence dashboard
└── dashboard/
    ├── viewer               consumer view
    ├── creator              creator risk view
    └── business             brand intelligence + compliance + monitoring
```

Auth uses a JWT stored in `localStorage`; the API client in `lib/api.ts` attaches
it to every request.
