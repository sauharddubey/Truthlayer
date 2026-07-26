"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteVideo } from "@/lib/api";
import { formatMetric, formatMetricPercent, formatUnitPercent, metricValue } from "@/lib/formatMetric";
import { ArrowRight, FileSearch } from "@/components/icons";

type Video = {
  video_id: string; title?: string; platform?: string; status?: string;
  mode?: string;
  trust_score?: number | null; risk_score?: number | null; sentiment_score?: number | null; bias_score?: number | null;
  supported_claims?: number;
  flagged_claims?: number;
  total_claims?: number;
  evidence_coverage_pct?: number | null;
};

const C = (t?: number | null, invert = false) => {
  if (t == null) return "#9b9a97";
  const v = invert ? 100 - t : t;
  return v >= 70 ? "#0f7b6c" : v >= 40 ? "#cb912f" : "#e03e3e";
};

function Ring({ value, size = 56 }: { value?: number | null; size?: number }) {
  const v = metricValue(value) ?? 0, r = size / 2 - 5, circ = 2 * Math.PI * r, col = C(value);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-heavy text-sm text-white">
        {value == null ? "·" : formatMetric(value)}
      </div>
    </div>
  );
}

function Bar({ label, value, invert = false }: { label: string; value?: number | null; invert?: boolean }) {
  const n = metricValue(value);
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[8.5px] font-bold">
        <span className="uppercase tracking-wider text-white/40">{label}</span>
        <span style={{ color: C(n, invert) }}>{n == null ? "—" : formatMetric(n)}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${n ?? 0}%`, background: C(n, invert) }} />
      </div>
    </div>
  );
}

function statusTone(s?: string) {
  if (s === "completed") return { c: "#0f7b6c", t: "Done" };
  if (s === "failed") return { c: "#e03e3e", t: "Failed" };
  return { c: "#cb912f", t: "Analyzing" };
}

export function VideoBoard({
  videos,
  emptyHref = "/analyze",
  variant = "default",
  onDeleted,
  loading = false,
  searchable = false,
}: {
  videos: Video[];
  emptyHref?: string;
  variant?: "default" | "verifier";
  onDeleted?: (videoId: string) => void;
  /** Before the first fetch resolves — show skeletons, not the empty state. */
  loading?: boolean;
  /** Show a title search box above the grid (for longer boards). */
  searchable?: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Skeletons while loading — so a populated board never flashes "No videos yet".
  if (loading && !videos.length) {
    return (
      <div className="grid auto-rows-[168px] grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`glass-tile animate-pulse ${i === 0 ? "col-span-2 row-span-2" : "col-span-2 lg:col-span-1"}`}
          />
        ))}
        <span className="sr-only">Loading your videos…</span>
      </div>
    );
  }

  async function confirmDelete(video: Video) {
    const ok = window.confirm("Delete this analysis? This cannot be undone.");
    if (!ok) return;
    setDeletingId(video.video_id);
    try {
      await deleteVideo(video.video_id);
      onDeleted?.(video.video_id);
    } catch (e: any) {
      window.alert(e?.message || "Failed to delete analysis");
    } finally {
      setDeletingId(null);
    }
  }

  if (!videos.length) {
    const steps = variant === "verifier"
      ? ["Paste any public video link", "We transcribe it and pull out every factual claim", "Each claim gets a verdict backed by live evidence"]
      : ["Upload a draft or paste a link", "We check facts, tone, bias and audience risk", "See what to fix before you publish"];
    return (
      <div className="glass-board flex min-h-[44vh] flex-col items-center justify-center px-6 py-10 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[90px]" />
        <FileSearch className="mb-3 h-8 w-8 text-white/40" />
        <p className="text-base font-semibold text-white/90">Your board is ready for its first video</p>
        <p className="mt-1 text-sm text-white/50">Here&apos;s what happens when you add one:</p>
        <ol className="mt-4 max-w-sm space-y-2 text-left">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/80">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <Link href={emptyHref} className="btn-accent mt-6">Analyze a video <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = searchable && q
    ? videos.filter((v) => (v.title || "").toLowerCase().includes(q))
    : videos;

  return (
    <div className="space-y-3">
      {searchable && (
        <input
          className="input max-w-xs"
          type="search"
          placeholder="Search by title…"
          aria-label="Search videos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {searchable && q && !shown.length ? (
        <p className="py-6 text-center text-sm text-white/50">
          No videos match “{query}”.{" "}
          <button className="text-accent hover:underline" onClick={() => setQuery("")}>Clear</button>
        </p>
      ) : (
      <div className="grid auto-rows-[168px] grid-cols-2 gap-3 lg:grid-cols-4">
      {shown.map((v, i) => {
        const featured = i === 0;
        const st = statusTone(v.status);
        return (
          <div
            key={v.video_id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/analysis/${v.video_id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") router.push(`/analysis/${v.video_id}`);
            }}
            className={`glass-tile group flex flex-col p-4 ${featured ? "col-span-2 row-span-2" : "col-span-2 lg:col-span-1"}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-40" />
            <div className="relative z-10 mb-2 flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/40">{v.platform || "video"}</span>
              <span className="ml-auto flex items-center gap-1 text-[9px] font-bold" style={{ color: st.c }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.c }} /> {st.t}
              </span>
              <button
                type="button"
                disabled={deletingId === v.video_id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDelete(v);
                }}
                className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white/35 transition hover:border-bad/40 hover:bg-bad/10 hover:text-bad disabled:opacity-50"
                title="Delete analysis"
              >
                {deletingId === v.video_id ? "Deleting" : "Delete"}
              </button>
            </div>

            <div className="relative z-10 flex flex-1 items-center gap-4">
              <Ring value={v.trust_score} size={featured ? 84 : 52} />
              {featured && variant !== "verifier" ? (
                <div className="flex-1 space-y-1.5">
                  <Bar label="Risk" value={v.risk_score} invert />
                  <Bar label="Sentiment" value={v.sentiment_score != null ? (v.sentiment_score + 1) * 50 : null} />
                  <Bar label="Bias" value={v.bias_score} invert />
                </div>
              ) : featured ? (
                <div className="flex-1 space-y-1.5 text-[10px] font-semibold text-white/70">
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-wider text-white/40">Claims</span>
                    <span>{v.supported_claims ?? 0}/{v.total_claims ?? 0} supported</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-wider text-white/40">Flagged</span>
                    <span>{v.flagged_claims ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-wider text-white/40">Evidence</span>
                    <span>{v.evidence_coverage_pct != null ? formatMetricPercent(v.evidence_coverage_pct) : "n/a"}</span>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-xs font-semibold text-white/80">{v.title || "Untitled"}</div>
                </div>
              )}
            </div>

            {featured && <div className="relative z-10 mt-2 line-clamp-1 text-sm font-bold text-white">{v.title || "Untitled video"}</div>}
            <div className="relative z-10 mt-1 flex items-center gap-1 text-[10px] font-bold text-white/30 transition group-hover:text-white/60">
              View analysis <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        );
      })}
      </div>
      )}
    </div>
  );
}
