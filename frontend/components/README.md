# Frontend React Component Library (`frontend/components`)

This directory contains reusable UI components, visualization modules, navigation bars, and layout shells for the TruthLayer web client.

## Component Library Manifest

| Component | Technical Description |
| :--- | :--- |
| **`AppShell.tsx`** | Main authenticated application layout providing the sidebar navigation, user session state header, and active workspace wrapper. |
| **`AnalysisBento.tsx`** | Comprehensive Bento-grid visualization rendering analysis reports, trust score gauges, confidence indicators, and multi-agent summaries. |
| **`ApiKeyGate.tsx`** | Modal overlay enforcing API key configuration before allowing users to submit new videos for analysis. |
| **`ClaimsPanel.tsx`** | Interactive table displaying extracted transcript claims, individual accuracy verdicts (verified, unverified, contradicted), confidence scores, and evidence citations. |
| **`DynamicNav.tsx`** | Responsive navigation bar adapting items dynamically based on whether the user is unauthenticated or logged into a specific role. |
| **`EvidencePanel.tsx`** | Evidence drill-down modal showing live web search citations (Tavily) or matching internal product RAG chunks. |
| **`GoogleAuthButton.tsx`** | Standardized Google OAuth trigger button initiating Supabase authentication redirects. |
| **`HeroScroll.tsx`** | Scroll-driven animated hero element for the landing page (`/`). |
| **`Modal.tsx`** | Accessible dialog overlay wrapper supporting customized headers, actions, and key bindings. |
| **`Navbar.tsx`** | Top-level header component used across public marketing pages. |
| **`PhoneMock.tsx`** | Interactive mobile device frame simulating social media video playback (TikTok/Reels style) with overlaid real-time claim flags. |
| **`PipelineTimeline.tsx`** | Live polling progress bar demonstrating the step-by-step processing status (`INGESTING`, `TRANSCRIBING`, `STRUCTURING`, `ANALYZING`, `COMPLETED`). |
| **`SentimentTimeline.tsx`** | Recharts linear area graph rendering emotional valence and tone shifts across video time codes. |
| **`TranscriptPanel.tsx`** | Timestamped transcript viewer with search filtering and claim highlighting. |
| **`VideoBoard.tsx`** | Grid/list view displaying submitted videos, status indicators, thumbnail previews, and filter controls. |
| **`WhyTruthLayer.tsx`** | Detailed feature breakdown grid used on the marketing landing page. |
| **`icons.tsx`** | Comprehensive inline SVG icon library eliminating external font-icon dependencies and ensuring zero emoji reliance. |
| **`motion.tsx`** | Framer Motion wrapper components simplifying scroll animations and reveal dynamics. |

## Design Conventions

* **No Emojis**: Visual indicators rely strictly on clean SVG vector icons defined in `components/icons.tsx`.
* **Notion-Style Theme**: Color palettes strictly utilize design tokens (`ink`, `paper`, `surface`, `line`, `accent`, `good`, `warn`, `bad`) specified in `tailwind.config.ts`.
* **Accessibility**: Modal components preserve focus traps and support Keyboard `Escape` dismissals.
