"use client";

import { useEffect, useRef, useState } from "react";
import { getAnalysis, getRole, reportPdfUrl, reviewClaim, startAnalysis } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { AnalysisBento } from "@/components/AnalysisBento";
import { ArrowRight, AlertTriangle } from "@/components/icons";

const TERMINAL = ["completed", "failed"];

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const [data, setData]       = useState<any>(null);
  const [error, setError]     = useState("");
  const [nonce, setNonce]     = useState(0);
  const [rerunning, setRerunning] = useState(false);
  const [role, setRole]       = useState<string | null>(null);
  const timer = useRef<any>(null);

  useEffect(() => setRole(getRole()), []);

  useEffect(() => {
    async function poll() {
      try {
        const d = await getAnalysis(params.id);
        setData(d);
        if (!TERMINAL.includes(d.video.processing_status)) timer.current = setTimeout(poll, 3000);
      } catch (e: any) { setError(e.message); }
    }
    poll();
    return () => clearTimeout(timer.current);
  }, [params.id, nonce]);

  async function reanalyze() {
    setRerunning(true); setError("");
    try {
      await startAnalysis(params.id);
      setData((d: any) => (d ? { ...d, video: { ...d.video, processing_status: "pending" } } : d));
      setNonce((n) => n + 1);
    } catch (e: any) { setError(e.message); } finally { setRerunning(false); }
  }

  async function onReview(claimId: string, status: "approved" | "rejected") {
    try { await reviewClaim(claimId, status); setNonce((n) => n + 1); } catch (e: any) { setError(e.message); }
  }

  if (error) return (
    <AppShell><div className="card py-8 text-center"><p className="font-semibold text-bad">{error}</p></div></AppShell>
  );
  if (!data) return (
    <AppShell><div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div></AppShell>
  );

  const { video, report, claims } = data;
  const status = video.processing_status;
  const agents = report?.agent_results || {};
  const content = agents.content || {};
  const isProduct = !!content.is_about_product;
  const products: string[] = content.products || [];
  const isBusiness = role === "business";

  /* ── Processing ── */
  if (!TERMINAL.includes(status)) {
    const stages = ["pending", "ingesting", "transcribing", "structuring", "analyzing", "fusing"];
    const idx = stages.indexOf(status);
    const pct = idx >= 0 ? Math.round(((idx + 1) / stages.length) * 100) : 50;
    return (
      <AppShell>
        <div className="mx-auto max-w-lg">
          <div className="glass-tile space-y-5 p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <div>
              <div className="text-base font-bold text-white">Analyzing…</div>
              <div className="mt-1 text-sm text-white/50">Stage: <span className="font-semibold text-accent">{status}</span></div>
            </div>
            <div className="mx-auto max-w-xs">
              <div className="mb-1.5 flex justify-between text-xs text-white/40"><span>Progress</span><span>{pct}%</span></div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Failed ── */
  if (status === "failed") {
    return (
      <AppShell>
        <div className="card mx-auto max-w-lg space-y-3 py-8 text-center">
          <div className="flex items-center justify-center gap-2 text-bad"><AlertTriangle className="h-5 w-5" /><h1 className="text-lg font-bold">Analysis failed</h1></div>
          <p className="text-sm text-ink-light">{video.error}</p>
          <button className="btn-accent" disabled={rerunning} onClick={reanalyze}>{rerunning ? "Retrying…" : "Try again"} <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </AppShell>
    );
  }

  /* ── Completed: bento block board ── */
  return (
    <AppShell wide>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="chip">{video.platform}</span>
            <span className={`chip ${isProduct ? "border-accent/25 bg-accent/5 text-accent" : ""}`}>
              {isProduct ? "Product video" : (content.content_type || "video")}
            </span>
            {isProduct && products.length > 0 && <span className="chip">{products.slice(0, 2).join(", ")}</span>}
          </div>
          <h1 className="font-heavy text-2xl uppercase leading-tight tracking-tight text-ink">{video.title || "Analysis"}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn" disabled={rerunning} onClick={reanalyze}>{rerunning ? "Re-analyzing…" : "Re-analyze"} <ArrowRight className="h-3.5 w-3.5" /></button>
          <a className="btn-ghost" href={reportPdfUrl(video.id)} target="_blank" rel="noreferrer">PDF</a>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</div>}

      <AnalysisBento
        video={video} report={report} claims={claims}
        isBusiness={isBusiness} isProduct={isProduct}
        onReview={isBusiness ? onReview : undefined}
      />
    </AppShell>
  );
}
