"use client";

import { Check, AlertTriangle, ShieldCheck, Sparkle, Layers, FileSearch } from "@/components/icons";

/* Same score→color mapping the live dashboard (AnalysisBento) uses. */
const C = (t: number, invert = false) => {
  const v = invert ? 100 - t : t;
  return v >= 70 ? "#0f7b6c" : v >= 40 ? "#cb912f" : "#e03e3e";
};

/** Compact dashboard ring — mirrors the bento <Ring /> on the analyze page. */
function Ring({ value, color, size = 78, label }: { value: number; color: string; size?: number; label?: string }) {
  const r = size / 2 - 6, circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heavy text-xl text-white leading-none">{value}</span>
        {label && <span className="mt-0.5 text-[6.5px] font-bold uppercase tracking-widest text-white/40">{label}</span>}
      </div>
    </div>
  );
}

/** Compact dashboard mini-bar — mirrors the bento <MiniBar />. */
function MiniBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const col = C(value, invert);
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[8px] font-bold">
        <span className="uppercase tracking-wider text-white/40">{label}</span>
        <span style={{ color: col }}>{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: col }} />
      </div>
    </div>
  );
}

/* Tiny bento header row, matching the <Block /> label style. */
function TileLabel({ icon, color, children }: { icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span style={{ color }}>{icon}</span>
      <span className="text-[7.5px] font-extrabold uppercase tracking-widest text-white/40">{children}</span>
    </div>
  );
}

/** A TruthLayer video-analysis screen — mirrors the live dark-glass bento dashboard. */
export function PhoneMock() {
  const trust = 92;

  return (
    <div className="relative w-[260px] h-[530px] rounded-[40px] border-[7px] border-ink bg-white shadow-pop select-none flex flex-col overflow-hidden">
      {/* Ambient dashboard glow */}
      <div className="pointer-events-none absolute -top-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-good/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 -right-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

      {/* Notch */}
      <div className="absolute left-1/2 top-0 z-20 h-4 w-28 -translate-x-1/2 rounded-b-xl bg-ink" />

      {/* Status Bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-1 pt-3.5 text-[9.5px] font-semibold text-ink/40">
        <span>9:41</span>
        <span className="h-1.5 w-4 rounded-sm bg-ink/20" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-ink" />
          <span className="text-xs font-black tracking-tight text-ink">TruthLayer</span>
        </div>
        <span className="text-[7px] font-extrabold text-good bg-good/15 px-2 py-0.5 rounded-full uppercase tracking-wider">Calibrated</span>
      </div>

      {/* Bento grid */}
      <div className="relative z-10 flex-1 flex flex-col gap-2 px-4 py-3 overflow-hidden">

        {/* TRUST HERO tile */}
        <div className="glass-tile p-3">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40"
            style={{ backgroundImage: "linear-gradient(135deg,#0f7b6c1f,transparent 60%)" }} />
          <div className="relative z-10">
            <TileLabel icon={<ShieldCheck className="h-3 w-3" />} color="#0f7b6c">Trust</TileLabel>
            <div className="flex items-center gap-3">
              <Ring value={trust} color={C(trust)} label="trust" />
              <div className="flex-1 space-y-1.5">
                <MiniBar label="Risk" value={28} invert />
                <MiniBar label="Sentiment" value={64} />
                <MiniBar label="Authenticity" value={96} />
              </div>
            </div>
          </div>
        </div>

        {/* Two stat tiles */}
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-tile p-2.5">
            <TileLabel icon={<Sparkle className="h-3 w-3" />} color="#2383e2">Compliance</TileLabel>
            <div className="font-heavy text-2xl leading-none" style={{ color: C(88) }}>88</div>
            <div className="mt-1 text-[8px] text-white/40">guidelines pass</div>
          </div>
          <div className="glass-tile p-2.5">
            <TileLabel icon={<ShieldCheck className="h-3 w-3" />} color="#0f7b6c">Integrity</TileLabel>
            <div className="font-heavy text-2xl leading-none" style={{ color: C(96) }}>96%</div>
            <div className="mt-1 text-[8px] text-white/40">authenticity</div>
          </div>
        </div>

        {/* FACT-CHECK CLAIMS tile */}
        <div className="glass-tile flex-1 p-3">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40"
            style={{ backgroundImage: "linear-gradient(135deg,#2383e21f,transparent 60%)" }} />
          <div className="relative z-10 flex h-full flex-col">
            <TileLabel icon={<FileSearch className="h-3 w-3" />} color="#2383e2">Fact-check claims</TileLabel>
            <div className="mb-2 flex gap-1.5">
              <span className="rounded-full bg-good/15 px-1.5 py-0.5 text-[7.5px] font-extrabold text-good">2 verified</span>
              <span className="rounded-full bg-bad/15 px-1.5 py-0.5 text-[7.5px] font-extrabold text-bad">1 flagged</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5 text-[9.5px]">
                <Check className="h-3 w-3 shrink-0 text-good" />
                <span className="flex-1 truncate text-white/70">Vitamin C supports immunity</span>
              </div>
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5 text-[9.5px]">
                <Check className="h-3 w-3 shrink-0 text-good" />
                <span className="flex-1 truncate text-white/70">Hyaluronic acid hydrates</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9.5px]">
                <AlertTriangle className="h-3 w-3 shrink-0 text-bad" />
                <span className="flex-1 truncate text-white/70">&ldquo;Cures acne in 3 days&rdquo;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 mt-auto flex h-12 items-center justify-between border-t border-line px-8 text-ink/30 bg-white">
        <span className="flex flex-col items-center gap-0.5 text-accent"><Layers className="h-4 w-4" /><span className="text-[7px] font-bold uppercase tracking-wider">Audit</span></span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper shadow-pop"><Check className="h-4 w-4" /></span>
        <span className="flex flex-col items-center gap-0.5"><Layers className="h-4 w-4 rotate-180" /><span className="text-[7px] font-bold uppercase tracking-wider">History</span></span>
      </div>
    </div>
  );
}
