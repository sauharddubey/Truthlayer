"use client";

import { Check, AlertTriangle, Layers } from "@/components/icons";

/** A TruthLayer video-analysis screen — designer, minimal mobile mockup. */
export function PhoneMock() {
  const trust = 92;
  const r = 24;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative w-[260px] h-[530px] rounded-[40px] border-[7px] border-ink bg-paper shadow-pop select-none flex flex-col justify-between overflow-hidden">
      {/* Notch */}
      <div className="absolute left-1/2 top-0 z-10 h-4 w-28 -translate-x-1/2 rounded-b-xl bg-ink" />
      
      {/* Status Bar */}
      <div className="flex items-center justify-between px-5 pb-1 pt-3.5 text-[9.5px] font-semibold text-ink/40">
        <span>9:41</span>
        <span className="h-1.5 w-4 rounded-sm bg-ink/20" />
      </div>
      
      {/* Designer Header */}
      <div className="flex items-center justify-between px-5 pt-3">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-ink" />
          <span className="text-xs font-black tracking-tight text-ink">TruthLayer</span>
        </div>
        <span className="text-[7.5px] font-extrabold text-good bg-good/10 px-2 py-0.5 rounded-full uppercase tracking-wider">CALIBRATED</span>
      </div>

      {/* Main Score Area */}
      <div className="mx-5 my-2 flex flex-col items-center justify-center py-4 relative">
        <div className="relative h-28 w-28 flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="h-28 w-28 -rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" stroke="#f0f0ee" strokeWidth="3.5" />
            <circle cx="32" cy="32" r={r} fill="none" stroke="#0f7b6c" strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - trust / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-ink tracking-tighter leading-none">{trust}%</span>
            <span className="text-[8px] text-ink-faint font-bold uppercase tracking-widest mt-1">confidence</span>
          </div>
        </div>
      </div>

      {/* Minimal Overview Metrics */}
      <div className="mx-5 mb-3 grid grid-cols-2 gap-2 text-[9px] font-bold">
        <div className="rounded-lg bg-surface p-2 flex flex-col gap-0.5">
          <span className="text-ink-faint text-[8px] uppercase tracking-wider">Compliance</span>
          <span className="text-ink font-black">88% PASS</span>
        </div>
        <div className="rounded-lg bg-surface p-2 flex flex-col gap-0.5">
          <span className="text-ink-faint text-[8px] uppercase tracking-wider">Integrity</span>
          <span className="text-ink font-black">96% CLEAR</span>
        </div>
      </div>

      {/* Spoken Claims List (2 rows max, very clean) */}
      <div className="mx-5 mb-4 flex-1 flex flex-col justify-start">
        <div className="text-[8px] font-bold text-ink-faint uppercase tracking-widest mb-2">Key Findings</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1 border-b border-line">
            <span className="text-[9.5px] font-semibold text-ink-light truncate max-w-[130px]">Vitamin C check</span>
            <span className="flex items-center gap-1 text-[8.5px] font-extrabold text-good"><Check className="h-2.5 w-2.5 text-good" /> VERIFIED</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[9.5px] font-semibold text-ink-light truncate max-w-[130px]">Anti-acne claims</span>
            <span className="flex items-center gap-1 text-[8.5px] font-extrabold text-bad"><AlertTriangle className="h-2.5 w-2.5 text-bad" /> CONTRADICTED</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mt-auto flex h-14 items-center justify-between border-t border-line px-8 text-ink-faint bg-paper">
        <span className="flex flex-col items-center gap-0.5 text-accent"><Layers className="h-4 w-4" /><span className="text-[7px] font-bold uppercase tracking-wider">Audit</span></span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper shadow-pop hover:scale-105 transition"><Check className="h-4 w-4" /></span>
        <span className="flex flex-col items-center gap-0.5"><Layers className="h-4 w-4 rotate-180" /><span className="text-[7px] font-bold uppercase tracking-wider">History</span></span>
      </div>
    </div>
  );
}

function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-13 text-ink-light truncate shrink-0 text-[8px] font-semibold">{label}</span>
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
        <span className="block h-full rounded-full" style={{ width: `${v}%`, background: color }} />
      </span>
    </div>
  );
}
