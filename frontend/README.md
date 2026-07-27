# TruthLayer Frontend Subsystem

Next.js 14 (App Router) web application built with TypeScript, Tailwind CSS, Recharts, and Framer Motion. The frontend features role-tailored dashboards (`business`, `creator`, `verifier`), an interactive video submission page, a real-time live analysis dashboard, and marketing landing pages.

---

## Technical Architecture

```
frontend/
├── Dockerfile                  Container build instructions for Next.js app
├── README.md                   Frontend subsystem overview and execution guide
├── package.json                Node.js dependencies and script definitions
├── tailwind.config.ts          Tailwind CSS design tokens and custom animations
├── tsconfig.json               TypeScript compiler settings
├── next.config.js              Next.js runtime configuration and security headers
├── app/                        Next.js App Router pages, layouts, and global styles
├── components/                 Reusable React UI components
├── lib/                        API client, Supabase bindings, and custom hooks
└── public/                     Static images and brand assets
```

---

## Technology Stack

| Technology | Specification & Role |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling & Design System** | Tailwind CSS with Notion-inspired monochromatic UI design tokens (`ink`, `paper`, `surface`, `line`, `accent`) |
| **Typography** | Google Fonts: `Inter` (body/UI), `Anton` (display headers), `Fraunces` |
| **Visualizations** | Recharts (sentiment timelines, confidence radars, claim distribution charts) |
| **Animations** | Framer Motion (smooth scroll transitions, interactive hero element dynamics) |
| **Icons** | Custom SVG icon library (`components/icons.tsx`) — strictly zero external emoji reliance |

---

## Subsystem Navigation & Role Workspaces

The application enforces a dual-design philosophy:
1. **Public Marketing Portal (`/`)**: Editorial, scroll-animated showpiece highlighting core capabilities.
2. **Authenticated Workspace (`AppShell`)**: Clean, minimal workspace tailored to the user's active role:
   * **Business (`/dashboard/brand`)**: Product catalogs, RAG document management, hashtag tracking, multi-dimensional trust score breakdown, and narrative trend analytics.
   * **Creator (`/dashboard/creator`)**: Pre-publication risk audits, audience perception scoring, and sponsorship policy compliance.
   * **Verifier (`/dashboard/verifier`)**: Fact-checking queue, evidence validation cards, and trust score breakdowns.

---

## Business Tier Scoring Mechanism & Frontend Integration

The Business Tier Trust Score rendered in `AnalysisBento.tsx` and workspace dashboards represents a 5-dimensional composite audit rather than relying solely on uploaded knowledge base documents:

1. **Product Knowledge Base Compliance (35% Weight)**: Verifies claims against uploaded product specifications and marketing policy documents (`auto_verified`: 100%, `approved`: 100%, `needs_review`: 55%, `contradicted`/`rejected`: 0%).
2. **Factual Accuracy (25% Weight)**: Fact-checks general claims against external web evidence via Tavily search (`supported`: 100%, `unverified`: 50%, `misleading`: 15%, `contradicted`: 0%).
3. **Regulatory & Marketing Compliance (25% Weight)**: Evaluates legal disclaimers, FTC disclosure compliance, and prohibited financial/health statements via the `compliance` agent.
4. **Brand Safety & Bias (15% Weight)**: Penalizes bias score and perception harm index to safeguard corporate reputation.
5. **Media Authenticity Multiplier**: Scales the composite score by deepfake and visual manipulation analysis (`authenticity_score` from `0.0` to `1.0`).

$$\text{Business Trust Score} = \left(0.35 \cdot S_{\text{kb}} + 0.25 \cdot S_{\text{fact}} + 0.25 \cdot S_{\text{comp}} + 0.15 \cdot S_{\text{brand}}\right) \cdot S_{\text{authenticity}}$$

---

## Local Development Execution

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Launch Next.js local dev server
npm run dev
# App accessible at http://localhost:3000
```

---

## Verification & Type Checking

```bash
# Execute TypeScript compilation check without emitting files
npx tsc --noEmit
```
