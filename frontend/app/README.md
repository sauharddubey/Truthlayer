# Next.js App Router Structure (`frontend/app`)

This directory contains the route components, page layouts, global styling rules, and legal endpoints for the TruthLayer Next.js web application.

## Directory & Route Structure

| Route Path | Component File | Description & Purpose |
| :--- | :--- | :--- |
| `/` | `page.tsx` | Main editorial landing page featuring animated hero elements, value propositions, interactive feature demonstrations, and pricing tiers. |
| `/login` | `login/page.tsx` | User authentication page supporting email/password and Google OAuth sign-in. |
| `/register` | `register/page.tsx` | User registration page with explicit role selection (`business`, `creator`, `verifier`). |
| `/reset` | `reset/page.tsx` | Password reset request and confirmation form. |
| `/analyze` | `analyze/page.tsx` | Video submission workspace supporting public platform URL submission or direct video file upload. |
| `/analysis/[id]` | `analysis/[id]/page.tsx` | Interactive analysis workspace rendering live status updates, overall trust score breakdown, sentiment timeline, claims list, and evidence panels. |
| `/products` | `products/page.tsx` | Product catalog overview for business users. |
| `/products/[id]` | `products/[id]/page.tsx` | Individual product workspace displaying associated videos, compliance knowledge base upload area, hashtag monitoring controls, and narrative analytics. |
| `/settings` | `settings/page.tsx` | Account management workspace for updating profile info, entering per-user OpenRouter/Tavily API keys, and selecting default AI models. |
| `/dashboard/brand` | `dashboard/brand/page.tsx` | Business role workspace focusing on brand monitoring, product compliance, and overall trust metrics. |
| `/dashboard/creator` | `dashboard/creator/page.tsx` | Creator role workspace displaying pre-publication video risk evaluations and perception indicators. |
| `/dashboard/verifier` | `dashboard/verifier/page.tsx` | Verifier role workspace displaying general fact-check results and trust scores across analyzed videos. |
| `/privacy` | `privacy/page.tsx` | Platform privacy policy, data encryption standards, and third-party disclosure details. |
| `/terms` | `terms/page.tsx` | Terms of service and platform acceptable use policy. |
| `/docs` | `docs/page.tsx` | Interactive platform user manual and API usage documentation. |

## Layouts & Global Styles

* **`layout.tsx`**: Root HTML layout embedding primary fonts (`Inter`, `Anton`, `Fraunces`), setting metadata, and wrapping the app in global context providers.
* **`globals.css`**: Tailwind base directives, custom color utility classes, scrollbar styles, and keyframe animations.
* **`manifest.ts`**: Web App Manifest defining application icons, theme colors, and PWA settings.
