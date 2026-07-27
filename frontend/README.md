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
   * **Business (`/dashboard/brand`)**: Product catalogs, RAG document management, hashtag tracking, and narrative trend analytics.
   * **Creator (`/dashboard/creator`)**: Pre-publication risk audits, audience perception scoring, and sponsorship policy compliance.
   * **Verifier (`/dashboard/verifier`)**: Fact-checking queue, evidence validation cards, and trust score breakdowns.

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
