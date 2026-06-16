"use client";

import { useState } from "react";
import { CornerDownRight } from "@/components/icons";

type Segment = {
  start?: number; end?: number; text: string;
  label?: "safe" | "verify" | "risky"; category?: string; reason?: string;
};

const STYLES: Record<string, { row: string; tag: string; label: string }> = {
  risky: { row: "border-l-2 border-bad bg-bad/[0.04]", tag: "bg-bad/10 text-bad", label: "Risky" },
  verify: { row: "border-l-2 border-warn bg-warn/[0.05]", tag: "bg-warn/10 text-warn", label: "Verify" },
  safe: { row: "border-l-2 border-line", tag: "bg-surface text-ink-faint", label: "Safe" },
};

function fmt(t?: number) {
  if (t == null) return "0:00";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptPanel({ segments }: { segments: Segment[] }) {
  const [filter, setFilter] = useState<"all" | "verify" | "risky">("all");
  if (!segments?.length) return <div className="card text-sm text-ink-light">No transcript available.</div>;

  const counts = segments.reduce((a, s) => {
    const l = s.label || "safe"; a[l] = (a[l] || 0) + 1; return a;
  }, {} as Record<string, number>);
  const shown = segments.filter((s) => filter === "all" || (s.label || "safe") === filter);

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-base font-semibold">Transcript</div>
        <div className="flex items-center gap-0.5 rounded-md border border-line p-0.5 text-xs">
          {(["all", "verify", "risky"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 font-medium capitalize transition ${filter === f ? "bg-ink text-paper" : "text-ink-light hover:bg-hover"}`}>
              {f}{f !== "all" && counts[f] ? ` ${counts[f]}` : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-light">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-line align-middle" />Safe {counts.safe || 0}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-warn align-middle" />Needs verification {counts.verify || 0}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-bad align-middle" />Risky {counts.risky || 0}</span>
      </div>
      <div className="max-h-[460px] space-y-1 overflow-y-auto pr-1">
        {shown.map((s, i) => {
          const st = STYLES[s.label || "safe"];
          return (
            <div key={i} className={`rounded-r-md py-2 pl-3 pr-2 ${st.row}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-ink-faint">{fmt(s.start)}</span>
                <p className="flex-1 text-sm text-ink">{s.text}</p>
                {s.label && s.label !== "safe" && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.tag}`}>{st.label}</span>
                )}
              </div>
              {s.reason && s.label !== "safe" && (
                <p className="mt-1 flex items-start gap-1.5 pl-10 text-xs text-ink-light">
                  <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0" /> {s.reason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
