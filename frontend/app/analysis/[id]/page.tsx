"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteVideo, downloadReportPdf, getAnalysis, getRole, reviewClaim, routeForRole, startAnalysis } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { AnalysisBento } from "@/components/AnalysisBento";
import { Check, Sparkle, Link2, AudioLines, FileSearch, Network, ArrowRight, ArrowUpRight, AlertTriangle } from "@/components/icons";

const STAGES = [
  {
    key: "pending",
    label: "Queueing & Preparation",
    desc: "Initializing video audit and verifying runtime OpenRouter configurations.",
    icon: <Sparkle className="h-4 w-4" />,
  },
  {
    key: "ingesting",
    label: "Media Ingestion",
    desc: "Extracting video metadata, subtitles, and downloading audio via yt-dlp.",
    icon: <Link2 className="h-4 w-4" />,
  },
  {
    key: "transcribing",
    label: "Speech-to-Text Transcription",
    desc: "Converting audio track into timestamped word segments using custom transcription models.",
    icon: <AudioLines className="h-4 w-4" />,
  },
  {
    key: "structuring",
    label: "Transcript Structuring",
    desc: "Segmenting transcripts into semantic blocks and isolating candidate claims.",
    icon: <FileSearch className="h-4 w-4" />,
  },
  {
    key: "analyzing",
    label: "Multi-Agent AI Analysis",
    desc: "Running fact-check, compliance, bias, sentiment, and perception agents in parallel.",
    icon: <Network className="h-4 w-4" />,
  },
];

const TERMINAL = ["completed", "failed"];

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [error, setError]     = useState("");
  const [nonce, setNonce]     = useState(0);
  const [rerunning, setRerunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
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

  async function removeAnalysis() {
    const ok = window.confirm("Delete this analysis? This cannot be undone.");
    if (!ok) return;
    setDeleting(true);
    setError("");
    try {
      await deleteVideo(params.id);
      router.push(role ? routeForRole(role) : "/dashboard/verifier");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  if (error) return (
    <AppShell><div className="card py-8 text-center"><p className="font-semibold text-bad">{error}</p></div></AppShell>
  );
  if (!data) return (
    <AppShell><div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div></AppShell>
  );

  const { video, report, claims } = data;
  const diagnostics = report?.score_reasonings?.diagnostics || {};
  const status = video.processing_status;
  const agents = report?.agent_results || {};
  const content = agents.content || {};
  const isProduct = !!content.is_about_product;
  const products: string[] = content.products || [];
  const isBusiness = role === "business";

  /* ── Processing ── */
  if (!TERMINAL.includes(status)) {
    const stages = ["pending", "ingesting", "transcribing", "structuring", "analyzing"];
    const currentIdx = stages.indexOf(status);
    const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stages.length) * 100) : 10;
    return (
      <AppShell>
        <div className="mx-auto max-w-lg">
          <div className="glass-tile overflow-hidden p-8 shadow-2xl">
            {/* Ambient background blur blobs */}
            <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-accent/20 blur-2xl" />
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-good/10 blur-2xl" />
            
            <div className="relative z-10 space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 border border-accent/20 animate-pulse mb-3">
                  <Sparkle className="h-5 w-5 text-accent" />
                </div>
                <h2 className="text-lg font-heavy uppercase tracking-tight text-white">Auditing Video Content</h2>
                <p className="mt-1 text-xs text-white/40">Our multi-agent AI fleet is scanning your media...</p>
              </div>

              {/* Progress bar */}
              <div className="rounded-xl bg-white/5 border border-white/[0.03] p-4">
                <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <span>Audit Progress</span>
                  <span className="text-accent">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-good transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Stage Checklist */}
              <div className="space-y-3">
                {STAGES.map((s, idx) => {
                  const isCompleted = idx < currentIdx;
                  const isActive = idx === currentIdx;
                  const isUpcoming = idx > currentIdx;

                  let borderCol = "border-white/5";
                  let bgCol = "bg-white/[0.02]";
                  let textCol = "text-white/30";
                  
                  if (isActive) {
                    borderCol = "border-accent/30 bg-accent/5";
                    bgCol = "bg-accent/10";
                    textCol = "text-white font-semibold";
                  } else if (isCompleted) {
                    borderCol = "border-good/20 bg-good/[0.02]";
                    bgCol = "bg-good/5";
                    textCol = "text-white/80";
                  }

                  return (
                    <div
                      key={s.key}
                      className={`flex gap-4 rounded-xl border p-4 transition-all duration-300 ${borderCol} ${bgCol}`}
                    >
                      {/* Left: icon/status */}
                      <div className="flex shrink-0 items-start pt-0.5">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-300 ${
                            isCompleted
                              ? "border-good/30 bg-good/10 text-good"
                              : isActive
                              ? "border-accent/40 bg-accent/20 text-accent animate-pulse"
                              : "border-white/10 bg-white/5 text-white/30"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            s.icon
                          )}
                        </div>
                      </div>

                      {/* Right: details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold transition-colors duration-300 ${textCol}`}>
                            {s.label}
                          </span>
                          {isActive && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                          )}
                        </div>
                        <p
                          className={`mt-1 text-[11px] leading-relaxed transition-colors duration-300 ${
                            isActive
                              ? "text-white/60 font-medium"
                              : isCompleted
                              ? "text-white/45"
                              : "text-white/20"
                          }`}
                        >
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button className="btn-accent" disabled={rerunning} onClick={reanalyze}>{rerunning ? "Retrying…" : "Try again"} <ArrowRight className="h-3.5 w-3.5" /></button>
            <button className="btn-ghost text-bad" disabled={deleting} onClick={removeAnalysis}>{deleting ? "Deleting…" : "Delete"}</button>
          </div>
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
          {video.source_url && (
            <a
              href={video.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-light transition hover:text-ink hover:underline"
            >
              Watch original video
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn" disabled={rerunning} onClick={reanalyze}>{rerunning ? "Re-analyzing…" : "Re-analyze"} <ArrowRight className="h-3.5 w-3.5" /></button>
          <button
            className="btn-ghost"
            disabled={downloadingPdf}
            onClick={async () => {
              setDownloadingPdf(true);
              setError("");
              try {
                await downloadReportPdf(video.id);
              } catch (e: any) {
                setError(e.message || "PDF download failed.");
              } finally {
                setDownloadingPdf(false);
              }
            }}
          >
            {downloadingPdf ? "Preparing…" : "PDF"}
          </button>
          <button className="btn-ghost text-bad" disabled={deleting} onClick={removeAnalysis}>{deleting ? "Deleting…" : "Delete"}</button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</div>}
      {diagnostics?.used_transcription_stub && (
        <div className="mb-4 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2 text-sm text-warn">
          This analysis used stub transcription data. Scores may be less reliable.
        </div>
      )}
      {diagnostics?.no_claims_extracted && (
        <div className="mb-4 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2 text-sm text-warn">
          No factual claims were extracted. Trust score is shown as insufficient evidence.
        </div>
      )}
      {diagnostics?.no_retrieved_evidence && !diagnostics?.no_claims_extracted && (
        <div className="mb-4 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2 text-sm text-warn">
          No external evidence was retrieved for this run. Verdict confidence may be lower.
        </div>
      )}
      {diagnostics?.media_integrity_used_stub && video.mode === "business" && (
        <div className="mb-4 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2 text-sm text-warn">
          Authenticity used a heuristic stub
          {diagnostics?.media_integrity_stub_reason
            ? ` (${String(diagnostics.media_integrity_stub_reason).replace(/_/g, " ")})`
            : ""}
          . Add a Hive API token, set BACKEND_PUBLIC_URL, and re-analyze for real deepfake detection.
        </div>
      )}

      <AnalysisBento
        video={video} report={report} claims={claims}
        isBusiness={isBusiness} isProduct={isProduct}
        onReview={isBusiness ? onReview : undefined}
      />
    </AppShell>
  );
}
