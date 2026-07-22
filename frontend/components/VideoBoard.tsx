"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { deleteVideo } from "@/lib/api";
import { formatMetric, metricValue } from "@/lib/formatMetric";
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
  if (t == null) return "rgb(var(--ink-faint))";
  const v = invert ? 100 - t : t;
  return v >= 70 ? "rgb(var(--good))" : v >= 40 ? "rgb(var(--warn))" : "rgb(var(--bad))";
};

/** Apple-activity-style score ring: thick rounded stroke, gradient when healthy. */
function Ring({ value, size = 56 }: { value?: number | null; size?: number }) {
  const gid = useId();
  const v = metricValue(value) ?? 0;
  const stroke = Math.max(7, Math.round(size / 9));
  const r = size / 2 - stroke / 2 - 1, circ = 2 * Math.PI * r;
  const healthy = value != null && v >= 70;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "rgb(var(--good))" }} />
            <stop offset="100%" style={{ stopColor: "rgb(var(--accent))" }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: "var(--ring-track)" }} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={healthy ? `url(#${gid})` : C(value)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-heavy leading-none text-ink ${size >= 100 ? "text-3xl" : size >= 70 ? "text-xl" : "text-base"}`}>
          {value == null ? "·" : formatMetric(value)}
        </span>
        {size >= 100 && <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-faint">Trust</span>}
      </div>
    </div>
  );
}

function Bar({ label, value, invert = false }: { label: string; value?: number | null; invert?: boolean }) {
  const n = metricValue(value);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] font-bold">
        <span className="uppercase tracking-wider text-ink-faint">{label}</span>
        <span style={{ color: C(n, invert) }}>{n == null ? "—" : formatMetric(n)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full" style={{ width: `${n ?? 0}%`, background: C(n, invert) }} />
      </div>
    </div>
  );
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{label}</span>
      {children}
    </div>
  );
}

function statusTone(s?: string) {
  if (s === "completed") return { c: "rgb(var(--good))", t: "Done" };
  if (s === "failed") return { c: "rgb(var(--bad))", t: "Failed" };
  return { c: "rgb(var(--warn))", t: "Analyzing" };
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
      <div className="grid auto-rows-[176px] grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
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
        <FileSearch className="mb-3 h-8 w-8 text-ink-faint" />
        <p className="text-base font-semibold text-ink">Your board is ready for its first video</p>
        <p className="mt-1 text-sm text-ink-light">Here&apos;s what happens when you add one:</p>
        <ol className="mt-4 max-w-sm space-y-2 text-left">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-ink-light">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/12 text-[11px] font-bold text-accent">{i + 1}</span>
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
    <div className="space-y-4">
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
        <p className="py-6 text-center text-sm text-ink-light">
          No videos match “{query}”.{" "}
          <button className="text-accent hover:underline" onClick={() => setQuery("")}>Clear</button>
        </p>
      ) : (
      <div className="grid auto-rows-[176px] grid-cols-2 gap-4 lg:grid-cols-4">
      {shown.map((v, i) => {
        const featured = i === 0;
        const st = statusTone(v.status);
        const analyzing = v.status !== "completed" && v.status !== "failed";
        return (
          <div
            key={v.video_id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/analysis/${v.video_id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") router.push(`/analysis/${v.video_id}`);
            }}
            className={`glass-tile group flex cursor-pointer flex-col ${featured ? "col-span-2 row-span-2 p-6" : "col-span-2 p-5 lg:col-span-1"}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-40" />
            <div className="relative z-10 mb-3 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">{v.platform || "video"}</span>
              <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: st.c }}>
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
                className="rounded-full border border-line px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint transition hover:border-bad/40 hover:bg-bad/10 hover:text-bad disabled:opacity-50"
                title="Delete analysis"
              >
                {deletingId === v.video_id ? "Deleting" : "Delete"}
              </button>
            </div>

            {featured ? (
              <>
                <div className="relative z-10 flex flex-1 items-center gap-6 py-1">
                  <Ring value={v.trust_score} size={124} />
                  {variant !== "verifier" ? (
                    <div className="flex-1 space-y-3">
                      <Bar label="Risk" value={v.risk_score} invert />
                      <Bar label="Sentiment" value={v.sentiment_score != null ? (v.sentiment_score + 1) * 50 : null} />
                      <Bar label="Bias" value={v.bias_score} invert />
                    </div>
                  ) : (
                    <div className="flex-1 space-y-3">
                      <StatRow label="Claims">
                        <span className="rounded-full bg-good/15 px-2.5 py-0.5 text-[11px] font-bold text-good">
                          {v.supported_claims ?? 0}/{v.total_claims ?? 0} supported
                        </span>
                      </StatRow>
                      <StatRow label="Flagged">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${(v.flagged_claims ?? 0) > 0 ? "bg-bad/15 text-bad" : "bg-ink/5 text-ink-light"}`}>
                          {v.flagged_claims ?? 0}
                        </span>
                      </StatRow>
                      <Bar label="Evidence" value={v.evidence_coverage_pct} />
                    </div>
                  )}
                </div>
                <div className="relative z-10 mt-3 line-clamp-1 text-lg font-bold tracking-[-0.01em] text-ink">{v.title || "Untitled video"}</div>
              </>
            ) : (
              <div className="relative z-10 flex flex-1 items-center gap-4">
                <Ring value={v.trust_score} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{v.title || "Untitled"}</div>
                  {analyzing && (
                    <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div className="absolute inset-y-0 w-2/5 animate-[vb-slide_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-accent/30 via-accent to-accent/30" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative z-10 mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-ink-faint transition group-hover:text-accent">
              View analysis <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        );
      })}
      </div>
      )}
      <style jsx global>{`
        @keyframes vb-slide { 0% { left: -40%; } 100% { left: 100%; } }
      `}</style>
    </div>
  );
}
