"use client";

import Link from "next/link";
import { ArrowRight, FileSearch } from "@/components/icons";

type Video = {
  video_id: string; title?: string; platform?: string; status?: string;
  trust_score?: number | null; risk_score?: number | null; sentiment_score?: number | null; bias_score?: number | null;
};

const C = (t?: number | null, invert = false) => {
  if (t == null) return "#9b9a97";
  const v = invert ? 100 - t : t;
  return v >= 70 ? "#0f7b6c" : v >= 40 ? "#cb912f" : "#e03e3e";
};

function Ring({ value, size = 56 }: { value?: number | null; size?: number }) {
  const v = value ?? 0, r = size / 2 - 5, circ = 2 * Math.PI * r, col = C(value);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-heavy text-sm text-white">
        {value == null ? "·" : Math.round(value)}
      </div>
    </div>
  );
}

function Bar({ label, value, invert = false }: { label: string; value?: number | null; invert?: boolean }) {
  const n = value == null ? null : Math.round(value);
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[8.5px] font-bold">
        <span className="uppercase tracking-wider text-white/40">{label}</span>
        <span style={{ color: C(n, invert) }}>{n ?? "—"}</span>
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

export function VideoBoard({ videos, emptyHref = "/analyze" }: { videos: Video[]; emptyHref?: string }) {
  if (!videos.length) {
    return (
      <div className="glass-board flex h-[44vh] flex-col items-center justify-center text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[90px]" />
        <FileSearch className="mb-3 h-8 w-8 text-white/30" />
        <p className="text-sm font-semibold text-white/80">No videos yet</p>
        <p className="mt-1 text-sm text-white/40">Analyze one to populate your board.</p>
        <Link href={emptyHref} className="btn-accent mt-5">Analyze a video <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-[168px] grid-cols-2 gap-3 lg:grid-cols-4">
      {videos.map((v, i) => {
        const featured = i === 0;
        const st = statusTone(v.status);
        return (
          <Link
            key={v.video_id}
            href={`/analysis/${v.video_id}`}
            className={`glass-tile group flex flex-col p-4 ${featured ? "col-span-2 row-span-2" : "col-span-2 lg:col-span-1"}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-40" />
            <div className="relative z-10 mb-2 flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/40">{v.platform || "video"}</span>
              <span className="ml-auto flex items-center gap-1 text-[9px] font-bold" style={{ color: st.c }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.c }} /> {st.t}
              </span>
            </div>

            <div className="relative z-10 flex flex-1 items-center gap-4">
              <Ring value={v.trust_score} size={featured ? 84 : 52} />
              {featured ? (
                <div className="flex-1 space-y-1.5">
                  <Bar label="Risk" value={v.risk_score} invert />
                  <Bar label="Sentiment" value={v.sentiment_score != null ? (v.sentiment_score + 1) * 50 : null} />
                  <Bar label="Bias" value={v.bias_score} invert />
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
          </Link>
        );
      })}
    </div>
  );
}
