import Link from "next/link";
import { Reveal } from "@/components/motion";
import { HeroScroll } from "@/components/HeroScroll";
import { PipelineTimeline } from "@/components/PipelineTimeline";
import { WhyTruthLayer } from "@/components/WhyTruthLayer";
import { Navbar } from "@/components/Navbar";
import { Layers, ArrowRight, Box, Eye, Scale, Check, ShieldCheck, FileSearch, AudioLines, Sparkle } from "@/components/icons";

/* ─── Tier Infographic: Business ──────────────────────────────────── */
function BusinessInfographic() {
  const lenses = [
    { label: "Fact-check",  score: 92, color: "rgb(var(--good))" },
    { label: "Compliance",  score: 87, color: "rgb(var(--accent))" },
    { label: "Perception",  score: 74, color: "rgb(var(--warn))" },
    { label: "Bias",        score: 81, color: "#9b59ff" },
    { label: "Integrity",   score: 96, color: "rgb(var(--good))" },
    { label: "Narrative",   score: 68, color: "rgb(var(--accent))" },
  ];
  const r = 22, circ = 2 * Math.PI * r;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {lenses.map((l) => {
          const offset = circ * (1 - l.score / 100);
          return (
            <div key={l.label} className="bg-surface border border-line rounded-2xl p-2.5 flex flex-col items-center gap-1.5 hover:border-ink/20 transition-all">
              <div className="relative h-11 w-11">
                <svg viewBox="0 0 60 60" className="h-11 w-11 -rotate-90">
                  <circle cx="30" cy="30" r={r} fill="none" style={{ stroke: "var(--ring-track)" }} strokeWidth="5" />
                  <circle cx="30" cy="30" r={r} fill="none" stroke={l.color} strokeWidth="5"
                    strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-ink">{l.score}</div>
              </div>
              <span className="text-[7.5px] font-bold text-ink-light uppercase tracking-wide text-center leading-tight">{l.label}</span>
            </div>
          );
        })}
      </div>
      <div className="bg-surface border border-accent/25 rounded-xl px-3 py-2 flex items-center gap-2">
        <FileSearch className="h-3.5 w-3.5 text-accent shrink-0" />
        <span className="text-[10px] font-semibold text-accent">Claims verified against product RAG database</span>
      </div>
    </div>
  );
}

/* ─── Tier Infographic: Creator ───────────────────────────────────── */
function CreatorInfographic() {
  const checks = [
    { label: "Factual accuracy", status: "warn",  value: "1 claim to fix" },
    { label: "Tone & perception", status: "good", value: "All clear" },
    { label: "Bias indicators",   status: "warn", value: "Mild hyperbole" },
    { label: "Sentiment arc",     status: "good", value: "Balanced" },
  ];
  const colText: Record<string, string> = { good: "rgb(var(--good))", warn: "rgb(var(--warn))" };
  const colBg: Record<string, string>   = { good: "rgb(var(--good) / 0.12)", warn: "rgb(var(--warn) / 0.12)" };
  const risk = 34;
  const circ = 2 * Math.PI * 28;
  const offset = circ * (risk / 100);
  return (
    <div className="space-y-3">
      {/* Risk gauge row */}
      <div className="bg-surface border border-line rounded-2xl p-3 flex items-center gap-4 hover:border-ink/20 transition-all">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" style={{ stroke: "var(--ring-track)" }} strokeWidth="6" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgb(var(--good))" strokeWidth="6"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-black text-good leading-none">{100 - risk}</span>
            <span className="text-[7px] font-bold text-ink-light uppercase">Safe</span>
          </div>
        </div>
        <div>
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-ink-light mb-1">Creator Risk Score</div>
          <div className="text-xs font-extrabold text-good">Low Risk</div>
          <div className="text-[10px] text-ink-light font-medium">Safe to publish after minor edits</div>
        </div>
      </div>
      {/* 2×2 status grid */}
      <div className="grid grid-cols-2 gap-2">
        {checks.map((c) => (
          <div key={c.label} className="bg-surface border border-line rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 hover:border-ink/20 transition-all">
            <span className="text-[9px] font-semibold text-ink-light leading-tight">{c.label}</span>
            <span className="text-[8px] font-extrabold shrink-0 px-1.5 py-0.5 rounded-md"
              style={{ color: colText[c.status], background: colBg[c.status] }}>
              {c.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tier Infographic: Verifier ──────────────────────────────────── */
function VerifierInfographic() {
  const claims = [
    { text: "Vitamin C fights flu",         verdict: "Supported",    color: "rgb(var(--good))", bg: "rgb(var(--good) / 0.12)" },
    { text: "\"Cures acne in 3 days\"",     verdict: "Contradicted", color: "rgb(var(--bad))", bg: "rgb(var(--bad) / 0.12)" },
    { text: "Hyaluronic acid binds water",  verdict: "Supported",    color: "rgb(var(--good))", bg: "rgb(var(--good) / 0.12)" },
    { text: "Clinically proven formula",    verdict: "Unverified",   color: "rgb(var(--warn))", bg: "rgb(var(--warn) / 0.12)" },
  ];
  return (
    <div className="space-y-3">
      {/* Authenticity bar */}
      <div className="bg-surface border border-line rounded-xl p-3 hover:border-ink/20 transition-all">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-good shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-ink-light">Media Authenticity</span>
              <span className="text-[9px] font-extrabold text-good">96%</span>
            </div>
            <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
              <div className="h-full rounded-full bg-good" style={{ width: "96%" }} />
            </div>
          </div>
        </div>
      </div>
      {/* Claims list */}
      <div className="space-y-1.5">
        {claims.map((c) => (
          <div key={c.text} className="bg-surface border border-line rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 hover:border-ink/20 transition-all">
            <span className="text-[10px] font-medium text-ink-light truncate">{c.text}</span>
            <span className="text-[8px] font-extrabold shrink-0 px-2 py-0.5 rounded-full"
              style={{ color: c.color, background: c.bg }}>
              {c.verdict}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tier definitions ────────────────────────────────────────────── */
const tiers = [
  {
    id: "business",
    badge: "Full Fleet · 8 Lenses",
    icon: <Box className="h-5 w-5" />,
    accentHex: "rgb(var(--accent))",
    glowClass: "from-accent/10",
    label: "Business Workspace",
    lead: "Compliance & brand safety at scale",
    bullets: [
      "Up to 8 AI lenses run in parallel per video",
      "RAG: claims verified against your product docs",
      "FTC / FDA disclosure detection, every sentence",
      "Narrative clustering across your full library",
    ],
    Infographic: BusinessInfographic,
    inputBadge: "YT · TikTok · IG · Files",
    outputBadge: "Dashboard + PDF",
  },
  {
    id: "creator",
    badge: "5 Lenses · Pre-publish",
    icon: <Eye className="h-5 w-5" />,
    accentHex: "rgb(var(--good))",
    glowClass: "from-good/10",
    label: "Creator Pre-Check",
    lead: "Audit your draft before the internet does",
    bullets: [
      "Fact-check, Perception, Bias, Sentiment, Risk",
      "Creator Risk Score: composite safety signal",
      "Tone & phrasing perception diagnostics",
      "Under 60 seconds from upload to verdict",
    ],
    Infographic: CreatorInfographic,
    inputBadge: "MP4 · MOV drafts",
    outputBadge: "Publish / Fix verdict",
  },
  {
    id: "verifier",
    badge: "2 Lenses · Public trust",
    icon: <Scale className="h-5 w-5" />,
    accentHex: "rgb(var(--warn))",
    glowClass: "from-warn/10",
    label: "Verifier Workspace",
    lead: "Fact-check any public video with evidence",
    bullets: [
      "Deepfake & manipulation detection",
      "All spoken claims extracted + timestamped",
      "Tavily live-web citations per claim verdict",
      "Works on any public YouTube / TikTok / IG URL",
    ],
    Infographic: VerifierInfographic,
    inputBadge: "Public links only",
    outputBadge: "Evidence-linked verdicts",
  },
];

export default function Home() {
  return (
    <div className="overflow-x-clip bg-paper text-ink selection:bg-accent-soft">
      <Navbar />
      <main>
      <HeroScroll />

      <div id="why-truthlayer" className="relative z-30">
        <WhyTruthLayer />
      </div>

      <div id="pipeline" className="border-t border-line/60 bg-sidebar/30">
        <PipelineTimeline />
      </div>

      {/* ── WORKSPACE TIERS — dark bento style matching WhyTruthLayer ── */}
      <section id="audiences" className="relative bg-paper border-t border-line/60 py-20 overflow-hidden">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-warn/5 blur-[100px]" />

        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <Reveal className="mb-16 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">User Tiers</span>
            <h2 className="mt-3 font-heavy text-5xl leading-[1.02] sm:text-6xl text-ink">
              Three workspace tiers
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-lg text-ink-light leading-relaxed">
              Purpose-built for three distinct relationships with video content.
            </p>
          </Reveal>

          <div className="grid gap-5 lg:grid-cols-3">
            {tiers.map((tier, i) => (
              <Reveal key={tier.id} delay={(i + 1) as 1 | 2 | 3}>
                <div className="glass-tile flex flex-col h-full shadow-2xl relative overflow-hidden group hover:border-ink/20 transition-all duration-300">

                  {/* Gradient glow overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${tier.glowClass} via-transparent to-transparent pointer-events-none opacity-40`} />

                  {/* ── Header ── */}
                  <div className="p-5 pb-4 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-line transition-all duration-300 group-hover:border-ink/20"
                        style={{ background: `color-mix(in srgb, ${tier.accentHex} 13%, transparent)`, color: tier.accentHex }}>
                        {tier.icon}
                      </div>
                      <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-ink-light bg-ink/5 border border-line px-2.5 py-1 rounded-full">
                        {tier.badge}
                      </span>
                    </div>
                    <div className="text-[9px] font-extrabold uppercase tracking-widest mb-1.5" style={{ color: tier.accentHex }}>
                      {tier.label}
                    </div>
                    <h3 className="text-[15px] font-extrabold leading-snug text-ink">{tier.lead}</h3>
                  </div>

                  {/* ── Infographic ── */}
                  <div className="px-5 pb-4 relative z-10">
                    <tier.Infographic />
                  </div>

                  {/* ── Bullets ── */}
                  <div className="px-5 pb-4 flex-1 relative z-10">
                    <div className="h-px bg-ink/5 mb-4" />
                    <ul className="space-y-2">
                      {tier.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <span style={{ color: tier.accentHex }} className="mt-0.5 shrink-0"><Check className="h-3 w-3" /></span>
                          <span className="text-[11px] text-ink-light leading-snug">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ── I/O footer ── */}
                  <div className="px-5 py-3 bg-ink/5 border-t border-line flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-1.5">
                      <AudioLines className="h-3 w-3 text-ink-light" />
                      <span className="text-[8.5px] font-bold text-ink-light uppercase tracking-wide">{tier.inputBadge}</span>
                    </div>
                    <div className="h-3 w-px bg-ink/10" />
                    <div className="flex items-center gap-1.5">
                      <Sparkle className="h-3 w-3 text-ink-light" />
                      <span className="text-[8.5px] font-bold text-ink-light uppercase tracking-wide">{tier.outputBadge}</span>
                    </div>
                  </div>

                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPLAINABLE BY DESIGN ────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-line/60 py-24 bg-paper">
        <div className="aurora pointer-events-none absolute -right-40 top-0 h-[30rem] w-[30rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, rgb(var(--accent)), transparent 65%)" }} />
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <h2 className="font-heavy text-5xl leading-[1.02] text-ink sm:text-7xl">
              Explainable<br /><span className="text-shine">by design.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-light">
              Every score carries its evidence and calibrated confidence. You can verify exactly why a claim passed, failed, or requires review.
            </p>
          </Reveal>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[["60s", "video analyzed in under a minute"], ["8", "AI lenses, run in parallel"], ["100%", "conclusions backed by evidence"]].map(([n, l], i) => (
              <Reveal key={l} delay={(i + 1) as 1 | 2 | 3}>
                <div className="font-heavy text-6xl text-accent">{n}</div>
                <div className="mt-1.5 text-xs text-ink-light font-semibold uppercase tracking-wider">{l}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div className="glass-board relative overflow-hidden px-8 py-20 text-center">
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full blur-3xl opacity-15"
              style={{ background: "radial-gradient(circle, rgb(var(--accent)), transparent 70%)" }} />
            <span className="text-sm font-bold uppercase tracking-widest text-accent">Get started free</span>
            <h2 className="mt-3 font-heavy text-5xl leading-[1.02] text-ink sm:text-6xl">
              Analyze your first<br />video in a minute.
            </h2>
            <p className="mt-5 text-ink-light text-lg max-w-md mx-auto leading-relaxed">
              Free to start. Bring a YouTube, TikTok or Instagram link — or upload a draft MP4.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href="/register" className="btn-accent px-7 py-3">
                Create your account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="#audiences" className="btn-ghost px-7 py-3">
                See workspace tiers
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
      </main>

      <footer className="border-t border-line/60 bg-sidebar/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-ink-faint">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-ink text-paper">
              <Layers className="h-3 w-3" />
            </span>
            <span className="font-bold text-ink">TruthLayer</span>
          </div>
          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:text-ink hover:underline">Terms</Link>
          </nav>
          <span>© {new Date().getFullYear()} — explainable trust & media intelligence.</span>
        </div>
      </footer>
    </div>
  );
}
