"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteVideo, downloadReportPdf, downloadReportJson, getAnalysis, getRole, reviewClaim, routeForRole, startAnalysis } from "@/lib/api";
import { safeExternalUrl } from "@/lib/safeUrl";
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

const POLL_INTERVAL_MS = 3000;
/** Consecutive poll failures tolerated before we stop retrying by ourselves. */
const MAX_POLL_FAILURES = 5;

/** Exponential backoff, capped — a blip retries fast, an outage backs off. */
function pollBackoffMs(consecutiveFailures: number) {
  return Math.min(POLL_INTERVAL_MS * Math.pow(1.6, consecutiveFailures - 1), 30_000);
}

type Degradation = { key: string; message: string };

/**
 * Reasons this run is less trustworthy than a full one.
 *
 * When a key is missing the agents still return numbers — a neutral 0 or 50 that
 * is indistinguishable from a real finding. Anything that silently weakened the
 * run has to be said out loud, in one place, in the user's terms.
 */
function degradationsFor(diagnostics: any, isBusiness: boolean): Degradation[] {
  const out: Degradation[] = [];
  if (!diagnostics) return out;

  if (diagnostics.llm_configured === false) {
    out.push({
      key: "llm",
      message:
        "No AI model key was available, so the bias, sentiment, perception and compliance scores are neutral placeholders — not real analysis. Add an OpenRouter key in Settings and re-analyze.",
    });
  }
  if (diagnostics.used_transcription_stub) {
    out.push({
      key: "transcription",
      message:
        "Speech was not really transcribed (placeholder transcript used), so everything derived from the words is unreliable.",
    });
  }
  if (diagnostics.no_claims_extracted) {
    out.push({
      key: "claims",
      message: "No factual claims were found to check, so the trust score reflects insufficient evidence rather than a verdict.",
    });
  } else if (diagnostics.no_retrieved_evidence) {
    out.push({
      key: "evidence",
      message: diagnostics.tavily_configured
        ? "No external evidence was found for this video's claims, so verdicts rest on the model alone."
        : "No web-search key is set, so claims were checked without live external evidence. Add a Tavily key in Settings for citation-backed verdicts.",
    });
  }
  if (isBusiness && diagnostics.media_integrity_used_stub) {
    const reason = diagnostics.media_integrity_stub_reason
      ? ` (${String(diagnostics.media_integrity_stub_reason).replace(/_/g, " ")})`
      : "";
    out.push({
      key: "media_integrity",
      message: `Authenticity and deepfake detection did not really run${reason} — the figure shown is a placeholder, not a measurement.`,
    });
  }
  return out;
}

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  /** Fatal: the analysis could never be loaded at all. Replaces the page. */
  const [loadError, setLoadError] = useState("");
  /** Non-fatal: a button (PDF/review/delete) failed. Shown inline, page intact. */
  const [actionError, setActionError] = useState("");
  /** Live updates gave up after repeated failures; last good data still shown. */
  const [pollStalled, setPollStalled] = useState(false);
  /** A poll failed but we're still retrying. */
  const [reconnecting, setReconnecting] = useState(false);
  const [nonce, setNonce]     = useState(0);
  const [rerunning, setRerunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [role, setRole]       = useState<string | null>(null);
  const timer = useRef<any>(null);
  const failures = useRef(0);
  const cancelled = useRef(false);
  /** Whether a good response has ever landed — decides stalled-banner vs fatal. */
  const hasData = useRef(false);

  useEffect(() => setRole(getRole()), []);

  /**
   * Poll until the run reaches a terminal state.
   *
   * A transient network blip must never destroy a running analysis: we retry
   * with backoff, keep the last good data on screen, and only fall back to a
   * full-page error when there is nothing to show (the very first load failed).
   */
  useEffect(() => {
    cancelled.current = false;
    failures.current = 0;

    async function poll() {
      if (cancelled.current) return;
      try {
        const d = await getAnalysis(params.id);
        if (cancelled.current) return;
        failures.current = 0;
        hasData.current = true;
        setReconnecting(false);
        setPollStalled(false);
        setLoadError("");
        setData(d);
        if (!TERMINAL.includes(d.video.processing_status)) {
          timer.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (e: any) {
        if (cancelled.current) return;
        failures.current += 1;
        const message = e?.message || "Couldn't reach the server.";

        if (failures.current < MAX_POLL_FAILURES) {
          // Still trying. Keep whatever is on screen.
          setReconnecting(true);
          timer.current = setTimeout(poll, pollBackoffMs(failures.current));
          return;
        }

        // Given up automatically — hand the user a manual retry. Data we already
        // have stays on screen; only a failed first load takes over the page.
        setReconnecting(false);
        if (hasData.current) setPollStalled(true);
        else setLoadError(message);
      }
    }

    poll();
    return () => {
      cancelled.current = true;
      clearTimeout(timer.current);
    };
  }, [params.id, nonce]);

  /** Manual "try again" after auto-retry gave up. */
  function retryNow() {
    setLoadError("");
    setPollStalled(false);
    setReconnecting(false);
    setNonce((n) => n + 1);
  }

  async function reanalyze() {
    setRerunning(true); setActionError("");
    try {
      await startAnalysis(params.id);
      setData((d: any) => (d ? { ...d, video: { ...d.video, processing_status: "pending" } } : d));
      setNonce((n) => n + 1);
    } catch (e: any) { setActionError(e.message); } finally { setRerunning(false); }
  }

  async function onReview(claimId: string, status: "approved" | "rejected") {
    setActionError("");
    try { await reviewClaim(claimId, status); setNonce((n) => n + 1); } catch (e: any) { setActionError(e.message); }
  }

  async function removeAnalysis() {
    const ok = window.confirm("Delete this analysis? This cannot be undone.");
    if (!ok) return;
    setDeleting(true);
    setActionError("");
    try {
      await deleteVideo(params.id);
      router.push(role ? routeForRole(role) : "/dashboard/verifier");
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  // Only a failed *first* load takes over the page — never an action error.
  if (loadError && !data) return (
    <AppShell>
      <div className="card mx-auto max-w-lg space-y-3 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-bad">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <h1 className="text-lg font-bold">Couldn&apos;t load this analysis</h1>
        </div>
        <p className="text-sm text-ink-light">{loadError}</p>
        <button className="btn-accent" onClick={retryNow}>Try again <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
      </div>
    </AppShell>
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
  const degradations = degradationsFor(diagnostics, video.mode === "business");

  /* ── Processing ── */
  if (!TERMINAL.includes(status)) {
    const stages = ["pending", "ingesting", "transcribing", "structuring", "analyzing"];
    const currentIdx = stages.indexOf(status);
    const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stages.length) * 100) : 10;
    const currentStageLabel = currentIdx >= 0 ? STAGES[currentIdx]?.label ?? "Preparing" : "Preparing";
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
                <p className="mt-1 text-xs text-white/70">Our multi-agent AI fleet is scanning your media...</p>
              </div>

              {/* Connection trouble — the run continues server-side either way. */}
              {(reconnecting || pollStalled) && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn"
                >
                  <span>
                    {pollStalled
                      ? "Live updates paused — your analysis is still running, we just lost contact."
                      : "Reconnecting…"}
                  </span>
                  {pollStalled && (
                    <button className="shrink-0 font-bold underline" onClick={retryNow}>
                      Reconnect
                    </button>
                  )}
                </div>
              )}

              {/* Progress bar */}
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl bg-white/5 border border-white/[0.03] p-4"
              >
                <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/70">
                  <span>Audit Progress</span>
                  <span className="text-accent">{pct}%</span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Audit progress"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-good transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="sr-only">{currentStageLabel} — {pct}% complete</span>
              </div>

              {/* Stage Checklist */}
              <div className="space-y-3">
                {STAGES.map((s, idx) => {
                  const isCompleted = idx < currentIdx;
                  const isActive = idx === currentIdx;
                  const isUpcoming = idx > currentIdx;

                  let borderCol = "border-white/5";
                  let bgCol = "bg-white/[0.02]";
                  let textCol = "text-white/70";
                  
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
                              : "border-white/10 bg-white/5 text-white/70"
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
                              ? "text-white/70 font-medium"
                              : isCompleted
                              ? "text-white/70"
                              : "text-white/70"
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
          <div className="flex items-center justify-center gap-2 text-bad"><AlertTriangle className="h-5 w-5" aria-hidden="true" /><h1 className="text-lg font-bold">Analysis failed</h1></div>
          <p className="text-sm text-ink-light">{video.error}</p>
          {actionError && <p className="text-sm text-bad">{actionError}</p>}
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
          {safeExternalUrl(video.source_url) && (
            <a
              href={safeExternalUrl(video.source_url) as string}
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
              setActionError("");
              try {
                await downloadReportPdf(video.id);
              } catch (e: any) {
                setActionError(e.message || "PDF download failed.");
              } finally {
                setDownloadingPdf(false);
              }
            }}
          >
            {downloadingPdf ? "Preparing…" : "PDF"}
          </button>
          <button
            className="btn-ghost"
            disabled={downloadingJson}
            onClick={async () => {
              setDownloadingJson(true);
              setActionError("");
              try {
                await downloadReportJson(video.id);
              } catch (e: any) {
                setActionError(e.message || "JSON export failed.");
              } finally {
                setDownloadingJson(false);
              }
            }}
          >
            {downloadingJson ? "Preparing…" : "JSON"}
          </button>
          <button className="btn-ghost text-bad" disabled={deleting} onClick={removeAnalysis}>{deleting ? "Deleting…" : "Delete"}</button>
        </div>
      </div>

      {actionError && <div className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{actionError}</div>}
      {pollStalled && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2 text-sm text-warn">
          <span>Live updates paused — we couldn&apos;t reach the server. This report may be out of date.</span>
          <button className="btn-ghost shrink-0 text-warn" onClick={retryNow}>Reconnect</button>
        </div>
      )}
      {degradations.length > 0 && (
        <div className="mb-4 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2.5 text-sm text-warn">
          <p className="font-semibold">
            {degradations.length === 1
              ? "This analysis ran with reduced accuracy."
              : `This analysis ran with reduced accuracy (${degradations.length} reasons).`}
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {degradations.map((d) => (
              <li key={d.key}>{d.message}</li>
            ))}
          </ul>
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
