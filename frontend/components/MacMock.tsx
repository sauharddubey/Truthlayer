"use client";

import { Layers, Check, AlertTriangle, FileSearch, Eye, Sparkle, ShieldCheck, Scale, Network } from "@/components/icons";

export function MacMock() {
  const trust = 92;
  const r = 16;
  const circ = 2 * Math.PI * r;

  const claims = [
    { text: "Contains 10% vitamin C", verdict: "Supported", note: "Matches formulation specs", tone: "good" },
    { text: "Cures acne in 3 days", verdict: "Contradicted", note: "Violates claims guidelines", tone: "bad" },
    { text: "Dermatologist tested", verdict: "Needs review", note: "Requires clinic reports", tone: "warn" },
  ];

  const toneText: Record<string, string> = { good: "text-good", bad: "text-bad", warn: "text-warn" };
  const toneBg: Record<string, string> = { good: "bg-good/12 text-good border-good/20", bad: "bg-bad/12 text-bad border-bad/20", warn: "bg-warn/12 text-warn border-warn/20" };

  return (
    <div className="relative mx-auto w-full max-w-[600px] select-none overflow-hidden">
      {/* MacBook Screen Shell */}
      <div className="relative rounded-t-xl border-x-[8px] border-t-[8px] border-[#1c1917] bg-[#1c1917] p-1 pb-0 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.45)] overflow-hidden">
        
        {/* Hardware Camera Notch in screen */}
        <div className="absolute left-1/2 top-0 z-40 h-3 w-20 -translate-x-1/2 rounded-b-md bg-[#1c1917] flex items-center justify-center gap-1.5 px-2">
          <span className="h-0.5 w-0.5 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
          <span className="h-1 w-1 rounded-full bg-stone-900" />
        </div>

        {/* Browser Frame - Fixed Height 320px */}
        <div className="overflow-hidden rounded-t-md bg-paper text-ink flex flex-col h-[320px] relative">
          
          {/* Browser Header */}
          <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-1.5 shrink-0">
            {/* macOS Window dots */}
            <div className="flex gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f56]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffbd2e]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#27c93f]" />
            </div>
            
            {/* Address Bar */}
            <div className="mx-auto flex h-4.5 w-[240px] items-center justify-center rounded border border-line text-[8px] font-medium text-ink-faint bg-paper">
              truthlayer.app/analysis/skincare-serum
            </div>
            
            <div className="w-8" />
          </div>

          {/* Web App Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-[120px] border-r border-line bg-sidebar p-2 flex flex-col justify-between shrink-0 overflow-hidden">
              <div className="space-y-2.5">
                {/* Logo */}
                <div className="flex items-center gap-1 px-0.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-ink text-paper shrink-0">
                    <Layers className="h-2.5 w-2.5" />
                  </span>
                  <span className="font-extrabold tracking-tight text-[10px]">TruthLayer</span>
                </div>
                
                {/* Navigation Items */}
                <nav className="space-y-0.5">
                  <span className="flex items-center gap-1 rounded px-1.5 py-0.8 text-[8.5px] font-semibold text-ink-light hover:bg-hover hover:text-ink cursor-pointer">
                    <Network className="h-2.5 w-2.5" /> Overview
                  </span>
                  <span className="flex items-center gap-1 rounded px-1.5 py-0.8 text-[8.5px] font-bold text-accent bg-accent-soft cursor-pointer">
                    <Eye className="h-2.5 w-2.5 text-accent" /> Analyses
                  </span>
                  <span className="flex items-center gap-1 rounded px-1.5 py-0.8 text-[8.5px] font-semibold text-ink-light hover:bg-hover hover:text-ink cursor-pointer">
                    <Layers className="h-2.5 w-2.5" /> Products KB
                  </span>
                  <span className="flex items-center gap-1 rounded px-1.5 py-0.8 text-[8.5px] font-semibold text-ink-light hover:bg-hover hover:text-ink cursor-pointer">
                    <Scale className="h-2.5 w-2.5" /> Rules
                  </span>
                </nav>
              </div>

              {/* Sidebar user */}
              <div className="border-t border-line pt-1.5 flex items-center gap-1 px-0.5 shrink-0">
                <div className="h-4.5 w-4.5 rounded-full bg-accent text-white flex items-center justify-center text-[8px] font-black shrink-0">S</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[8px] font-bold leading-none">Sauhard</div>
                  <div className="text-[7px] text-ink-faint leading-none mt-0.5">Business</div>
                </div>
              </div>
            </aside>

            {/* Dashboard Content */}
            <main className="flex-1 bg-paper p-3 overflow-hidden flex flex-col gap-2.5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-line pb-1.5 shrink-0">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-accent/10 border border-accent/20 px-1 py-0.1 text-[7.5px] font-bold text-accent">Active Analysis</span>
                    <span className="text-[8px] text-ink-faint">TL-9321</span>
                  </div>
                  <h1 className="mt-0.5 text-xs font-extrabold tracking-tight text-ink leading-none">Skincare serum review.mp4</h1>
                  <p className="text-[8px] text-ink-light mt-0.5 leading-none">YouTube · 0:48 · processed in 22s</p>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="flex items-center gap-1 rounded border border-line bg-surface px-1.5 py-0.8 text-[8px] font-semibold text-ink-light hover:bg-hover cursor-pointer">
                    PDF Export
                  </span>
                </div>
              </div>

              {/* Two-Column Grid */}
              <div className="grid grid-cols-5 gap-2.5 flex-1 overflow-hidden items-stretch">
                {/* Left Column (Claims Table) */}
                <div className="col-span-3 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between pb-1 shrink-0">
                    <h3 className="text-[8px] font-extrabold uppercase tracking-wider text-ink-faint flex items-center gap-1">
                      <FileSearch className="h-2.5 w-2.5" /> Spoken Claims
                    </h3>
                  </div>

                  <div className="space-y-1 overflow-y-auto flex-1 pr-1">
                    {claims.map((c, idx) => (
                      <div key={idx} className="rounded border border-line bg-surface/30 p-1.5 hover:bg-surface/60 transition">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            {c.tone === "good" ? (
                              <Check className="h-2.5 w-2.5 shrink-0 text-good" />
                            ) : (
                              <AlertTriangle className={`h-2.5 w-2.5 shrink-0 ${toneText[c.tone]}`} />
                            )}
                            <span className="truncate text-[9px] font-bold text-ink leading-tight">{c.text}</span>
                          </div>
                          <span className={`rounded-full border px-1 py-0.1 text-[7.5px] font-bold shrink-0 leading-none ${toneBg[c.tone]}`}>
                            {c.verdict}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[7.5px] text-ink-light pl-3.5 leading-tight">{c.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column (Score Widgets) */}
                <div className="col-span-2 space-y-1.5 overflow-hidden flex flex-col justify-between">
                  <h3 className="text-[8px] font-extrabold uppercase tracking-wider text-ink-faint flex items-center gap-1 shrink-0">
                    <Sparkle className="h-2.5 w-2.5" /> Lenses Scores
                  </h3>

                  {/* Trust Gauge & Mini Stats */}
                  <div className="rounded border border-line bg-surface/30 p-1.5 flex items-center gap-1.5 shrink-0">
                    <div className="relative h-9 w-9 shrink-0">
                      <svg viewBox="0 0 64 64" className="h-9 w-9 -rotate-90">
                        <circle cx="32" cy="32" r={r} fill="none" stroke="#e9e9e7" strokeWidth="4.5" />
                        <circle cx="32" cy="32" r={r} fill="none" stroke="#0f7b6c" strokeWidth="4.5" strokeLinecap="round"
                          strokeDasharray={circ} strokeDashoffset={circ * (1 - trust / 100)} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black leading-none">{trust}%</span>
                        <span className="text-[6px] text-ink-faint font-semibold">trust</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-0.8 text-[7.5px] min-w-0">
                      <Bar label="Compliance" v={88} color="#2383e2" />
                      <Bar label="Sentiment" v={74} color="#cb912f" />
                      <Bar label="Risk" v={22} color="#e03e3e" />
                    </div>
                  </div>

                  {/* Media Integrity Verification */}
                  <div className="rounded border border-line bg-surface/30 p-1.5 flex items-center gap-1 shrink-0">
                    <ShieldCheck className="h-3 w-3 text-good shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[8px] font-bold text-ink leading-none">
                        Deepfakes Clean
                      </div>
                      <div className="text-[7px] text-ink-light truncate mt-0.5 leading-none">96% authentic signals</div>
                    </div>
                  </div>

                  {/* Evidence sources */}
                  <div className="rounded border border-line bg-surface/30 p-1.5 shrink-0">
                    <div className="text-[7.5px] font-bold text-ink-faint uppercase tracking-wide leading-none">Sources Index</div>
                    <div className="mt-1 flex items-center justify-between text-[7px] text-ink leading-none">
                      <span>5 docs indexed</span>
                      <span className="text-accent hover:underline cursor-pointer font-bold">View</span>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* MacBook Base Shell (Notch on bottom base lip) */}
      <div className="relative h-2 w-[101.5%] -left-[0.75%] bg-[#a8a29e] rounded-b-lg border-t border-stone-200 flex items-center justify-center shrink-0">
        <div className="w-10 h-0.8 bg-[#444] rounded-b-sm absolute top-0" />
      </div>
      
      {/* MacBook Bottom Tray (provides 3D depth and thickness) */}
      <div className="h-1.5 w-[96%] bg-[#78716c] rounded-b-md mx-auto shadow-md border-t border-stone-600/30 shrink-0" />
    </div>
  );
}

function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5 leading-none">
      <span className="w-10 text-ink-light shrink-0 truncate text-[7.5px]">{label}</span>
      <span className="h-0.8 flex-1 overflow-hidden rounded-full bg-line">
        <span className="block h-full rounded-full" style={{ width: `${v}%`, background: color }} />
      </span>
      <span className="text-[7px] text-ink font-bold shrink-0 w-3 text-right">{v}</span>
    </div>
  );
}
