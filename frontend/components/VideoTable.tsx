"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/icons";

const statusColor: Record<string, string> = {
  completed: "bg-good/10 text-good",
  failed: "bg-bad/10 text-bad",
  pending: "bg-surface text-ink-light",
};

export function VideoTable({ videos, emptyHref = "/analyze" }: { videos: any[]; emptyHref?: string }) {
  if (!videos?.length) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-sidebar p-8 text-center text-sm text-ink-light">
        No videos yet. <Link href={emptyHref} className="font-medium text-accent">Analyze one</Link> to get started.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-sidebar text-left text-xs font-medium text-ink-light">
            <th className="px-4 py-2.5">Video</th>
            <th className="hidden px-2 sm:table-cell">Status</th>
            <th className="px-2">Trust</th>
            <th className="px-2">Risk</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {videos.map((v) => (
            <tr key={v.video_id} className="border-b border-line last:border-0 hover:bg-sidebar">
              <td className="max-w-xs truncate px-4 py-2.5 font-medium text-ink">{v.title || v.video_id}</td>
              <td className="hidden px-2 sm:table-cell">
                <span className={`rounded px-2 py-0.5 text-xs ${statusColor[v.status] || "bg-warn/10 text-warn"}`}>
                  {v.status}
                </span>
              </td>
              <td className="px-2">{v.trust_score != null ? Math.round(v.trust_score) : "—"}</td>
              <td className="px-2">{v.risk_score != null ? Math.round(v.risk_score) : "—"}</td>
              <td className="px-4 text-right">
                <Link href={`/analysis/${v.video_id}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
