"use client";

import { Check, AlertTriangle, ShieldCheck, Scale, Network, AudioLines, Eye, Box } from "@/components/icons";

/* Small product-UI mockups used across the marketing page — no stock photos,
   everything reflects the actual TruthLayer product, on one consistent palette. */

function Frame({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="rounded-xl border border-white/50 bg-paper/60 p-4 shadow-sm backdrop-blur-sm">
      {label && <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-light">{label}</div>}
      {children}
    </div>
  );
}export function MiniClaims() {
  return (
    <Frame label="Fact-check">
      <div className="space-y-1.5 py-1">
        <div className="flex items-center justify-between text-xs py-0.5">
          <span className="font-semibold text-ink truncate max-w-[100px]">Vitamin C claims</span>
          <span className="text-[9.5px] font-bold text-good">Verified</span>
        </div>
        <div className="flex items-center justify-between text-xs py-0.5">
          <span className="font-semibold text-ink truncate max-w-[100px]">Acne recovery speed</span>
          <span className="text-[9.5px] font-bold text-bad">Contradicted</span>
        </div>
      </div>
    </Frame>
  );
}

export function MiniPerception() {
  return (
    <Frame label="Perception">
      <div className="flex items-center justify-center gap-4 py-1">
        <div className="relative h-12 w-12 shrink-0">
          <svg viewBox="0 0 64 64" className="h-12 w-12 -rotate-90">
            <circle cx="32" cy="32" r={26} fill="none" stroke="#f0f0ee" strokeWidth="6" />
            <circle cx="32" cy="32" r={26} fill="none" stroke="#cb912f" strokeWidth="6" strokeLinecap="round" strokeDasharray={163} strokeDashoffset={163 * 0.7} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-black">30</div>
        </div>
        <div className="text-[10px] font-bold text-warn uppercase tracking-wider">Mild risk flagged</div>
      </div>
    </Frame>
  );
}

export function MiniCompliance() {
  return (
    <Frame label="Compliance">
      <div className="space-y-1.5 py-1 text-xs">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse" />
          <span>Sponsorship Disclosure</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse" />
          <span>Product Registry Match</span>
        </div>
      </div>
    </Frame>
  );
}

export function MiniBias() {
  return (
    <Frame label="Bias & sentiment">
      <div className="space-y-2 py-1 text-[10px] font-bold">
        <div className="flex items-center gap-2">
          <span className="w-16 text-ink-light font-semibold">Hype tone</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
            <span className="block h-full rounded-full bg-warn" style={{ width: "62%" }} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-ink-light font-semibold">Reframing</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
            <span className="block h-full rounded-full bg-accent" style={{ width: "38%" }} />
          </span>
        </div>
      </div>
    </Frame>
  );
}

export function MiniIntegrity() {
  return (
    <Frame label="Media integrity">
      <div className="flex items-center gap-2 py-1">
        <ShieldCheck className="h-5 w-5 text-good shrink-0" />
        <div className="text-xs font-extrabold text-good uppercase tracking-wider">96% Authentic</div>
      </div>
    </Frame>
  );
}

export function MiniNarrative() {
  return (
    <Frame label="Narrative">
      <div className="py-1">
        <svg viewBox="0 0 200 60" className="h-[40px] w-full">
          {[[30, 20], [90, 15], [150, 25]].map(([x, y], i) => (
            <g key={i}>
              {i > 0 && <line x1={x} y1={y} x2={[30, 90][i - 1]} y2={[20, 15][i - 1]} stroke="#e9e9e7" strokeWidth="1.5" />}
              <circle cx={x} cy={y} r={i === 1 ? 5 : 3} fill={i === 1 ? "#2383e2" : "#9b9a97"} />
            </g>
          ))}
        </svg>
        <div className="text-[8.5px] font-bold text-ink-faint uppercase tracking-wider text-center">Narrative cluster active</div>
      </div>
    </Frame>
  );
}

export const FEATURE_VISUALS: Record<string, () => JSX.Element> = {
  fact: MiniClaims,
  perception: MiniPerception,
  bias: MiniBias,
  compliance: MiniCompliance,
  integrity: MiniIntegrity,
  narrative: MiniNarrative,
};

/* ── Audience visuals ─────────────────────────────────────────────────────── */

export function BrandVisual() {
  return (
    <Frame label="Per-product">
      <div className="grid grid-cols-2 gap-2">
        {[["Serum", 92, "good"], ["Cleanser", 64, "warn"], ["Toner", 88, "good"], ["Mask", 41, "bad"]].map(([n, s, t]) => (
          <div key={n as string} className="rounded-lg border border-line p-2">
            <div className="flex items-center gap-1.5 text-xs font-medium"><Box className="h-3.5 w-3.5 text-ink-light" />{n as string}</div>
            <div className={`mt-1 text-lg font-bold ${t === "good" ? "text-good" : t === "warn" ? "text-warn" : "text-bad"}`}>{s as number}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function CreatorVisual() {
  return (
    <Frame label="Before you post">
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-bad/10 px-2.5 py-2 text-sm text-bad"><AlertTriangle className="h-4 w-4" /> 1 claim likely false</div>
        <div className="flex items-center gap-2 rounded-lg bg-warn/10 px-2.5 py-2 text-sm text-warn"><Eye className="h-4 w-4" /> Could read as dismissive</div>
        <div className="flex items-center gap-2 rounded-lg bg-good/10 px-2.5 py-2 text-sm text-good"><Check className="h-4 w-4" /> Safe to publish after edits</div>
      </div>
    </Frame>
  );
}

export function ViewerVisual() {
  return (
    <Frame label="Trust at a glance">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#e9e9e7" strokeWidth="7" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="#0f7b6c" strokeWidth="7" strokeLinecap="round" strokeDasharray={163} strokeDashoffset={163 * 0.12} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">88</div>
        </div>
        <div className="text-sm text-ink-light">Mostly accurate · low bias · 1 claim to double-check</div>
      </div>
    </Frame>
  );
}
