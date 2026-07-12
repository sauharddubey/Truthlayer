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

type SegmentLabel = "safe" | "verify" | "risky";

function normalizeLabel(raw?: string | null): SegmentLabel {
  const label = (raw || "safe").toLowerCase().trim();
  if (label === "verify" || label === "risky") return label;
  return "safe";
}

function segmentText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  return String(raw);
}

function fmt(t?: number) {
  if (t == null) return "0:00";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptPanel({ segments, ocr }: { segments: Segment[]; ocr?: any }) {
  const [filter, setFilter] = useState<"all" | "verify" | "risky">("all");

  const rows = Array.isArray(segments) ? segments : [];
  if (!rows.length) return <div className="card text-sm text-ink-light">No segments available.</div>;

  const counts = rows.reduce((a: Record<SegmentLabel, number>, s: Segment) => {
    const l = normalizeLabel(s.label);
    a[l] = (a[l] || 0) + 1;
    return a;
  }, { safe: 0, verify: 0, risky: 0 });

  const shown = rows.filter((s: Segment) => filter === "all" || normalizeLabel(s.label) === filter);

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-base font-semibold">{ocr ? "On-Screen Text (OCR)" : "Transcript"}</div>
        <div className="flex items-center gap-0.5 rounded-md border border-line p-0.5 text-xs bg-surface">
          {(["all", "verify", "risky"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 font-medium capitalize transition ${filter === f ? "bg-ink text-paper shadow-sm" : "text-ink-light hover:bg-hover"}`}>
              {f}{f !== "all" && counts[f] ? ` ${counts[f]}` : ""}
            </button>
          ))}
        </div>
      </div>

      {ocr?.ocr_analysis && (
        <div className={`mb-4 rounded-xl border p-4 text-xs ${
          ocr.ocr_analysis.relationship_verdict === "unrelated"
            ? "border-bad/20 bg-bad/[0.03] text-bad"
            : ocr.ocr_analysis.relationship_verdict === "partially_related"
            ? "border-warn/20 bg-warn/[0.03] text-warn"
            : "border-good/20 bg-good/[0.03] text-good"
        }`}>
          <div className="font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{
              backgroundColor: ocr.ocr_analysis.relationship_verdict === "unrelated" ? "#e03e3e" : ocr.ocr_analysis.relationship_verdict === "partially_related" ? "#cb912f" : "#0f7b6c"
            }} />
            Speech Relationship: {(ocr.ocr_analysis.relationship_verdict || "unknown").replace(/_/g, " ")}
          </div>
          <p className="text-ink-light leading-relaxed mt-0.5">{ocr.ocr_analysis.explanation}</p>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-light border-t border-line/40 pt-2">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-line align-middle" />Safe {counts.safe || 0}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-warn align-middle" />Needs verification {counts.verify || 0}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-bad align-middle" />Risky {counts.risky || 0}</span>
      </div>

      <div className="max-h-[460px] space-y-1 overflow-y-auto pr-1">
        {shown.map((s: Segment, i: number) => {
          const label = normalizeLabel(s.label);
          const st = STYLES[label];
          return (
            <div key={i} className={`rounded-r-md py-2 pl-3 pr-2 ${st.row}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-ink-faint">{fmt(s.start)}</span>
                <p className="flex-1 text-sm text-ink">{segmentText(s.text)}</p>
                {label !== "safe" && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.tag}`}>{st.label}</span>
                )}
              </div>
              {s.reason && label !== "safe" && (
                <p className="mt-1 flex items-start gap-1.5 pl-10 text-xs text-ink-light">
                  <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0" /> {s.reason}
                </p>
              )}
            </div>
          );
        })}
        {!shown.length && (
          <div className="text-center py-6 text-sm text-ink-faint">
            No segments found matching filter '{filter}'.
          </div>
        )}
      </div>
      <div className="mt-2 text-[10px] font-bold text-white/40">
        {rows.length} segments · {ocr ? "OCR on-screen text" : "speech transcript"}
      </div>
    </div>
  );
}
