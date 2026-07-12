"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { ClaimsPanel } from "@/components/ClaimsPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SentimentTimeline } from "@/components/SentimentTimeline";
import { Check, AlertTriangle, FileSearch, Eye, Scale, ShieldCheck, AudioLines, Network, Sparkle, ArrowRight, ScanLine } from "@/components/icons";
import { formatMetric, formatMetricNa, formatMetricPercent, formatUnitPercent, metricValue } from "@/lib/formatMetric";

const C = (t?: number | null, invert = false) => {
  if (t == null) return "#9b9a97";
  const v = invert ? 100 - t : t;
  return v >= 70 ? "#0f7b6c" : v >= 40 ? "#cb912f" : "#e03e3e";
};

function fmt(t?: number) {
  if (t == null) return "0:00";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatMarkdown(text?: string | null) {
  if (!text) return null;
  const paragraphs = text.split("\n").filter((p) => p.trim() !== "");
  return paragraphs.map((para, pIdx) => {
    const parts = para.split(/\*\*([^*]+)\*\*/g);
    return (
      <p key={pIdx} className="leading-relaxed">
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            return (
              <strong key={index} className="font-extrabold text-white">
                {part}
              </strong>
            );
          }
          return part;
        })}
      </p>
    );
  });
}

function formatMarkdownInline(text?: string | null) {
  if (!text) return null;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-extrabold text-white">
          {part}
        </strong>
      );
    }
    return part;
  });
}

function HashtagCheckPanel({ hashtagCheck }: { hashtagCheck: any }) {
  if (!hashtagCheck) return null;
  if (!hashtagCheck.description_available) {
    return (
      <div className="rounded-lg border border-line bg-surface p-3 text-xs text-ink-light">
        <div className="mb-1 font-semibold text-ink">Hashtag check</div>
        <p>No platform description available — hashtags were not checked.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-line bg-surface p-3 text-xs space-y-2">
      <div className="font-semibold text-ink">Hashtag check (description)</div>
      {(hashtagCheck.matches || []).map((m: any) => (
        <div key={m.keyword_id} className="flex items-center justify-between gap-3">
          <span className="text-ink-light">{m.keyword}</span>
          <span className={`font-bold ${m.present ? "text-good" : "text-bad"}`}>
            {m.present ? "Present" : "Missing"}
          </span>
        </div>
      ))}
      {!hashtagCheck.matches?.length && (
        <p className="text-ink-faint">No monitored hashtags configured for this video.</p>
      )}
    </div>
  );
}

/* ── Reusable bento block (dark glass, clickable to expand) ── */
function Block({ label, icon, color, span = "", onClick, children }: {
  label: string; icon: ReactNode; color: string; span?: string; onClick?: () => void; children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`glass-tile group relative flex flex-col p-4 text-left ${span} ${onClick ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40"
        style={{ backgroundImage: `linear-gradient(135deg, ${color}1f, transparent 60%)` }} />
      <div className="relative z-10 mb-2 flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/40">{label}</span>
        {onClick && <ArrowRight className="ml-auto h-3 w-3 text-white/20 transition group-hover:text-white/50" />}
      </div>
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </button>
  );
}

function Ring({ value, color, size = 92, label }: { value?: number | null; color: string; size?: number; label?: string }) {
  const r = size / 2 - 7, circ = 2 * Math.PI * r;
  const pct = metricValue(value) ?? 0;
  const display = value == null ? "N/A" : formatMetricNa(value);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-heavy leading-none text-white ${display === "N/A" ? "text-lg" : "text-2xl"}`}>{display}</span>
        {label && <span className="text-[7px] font-bold uppercase tracking-widest text-white/40 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

function MiniBar({ label, value, invert = false }: { label: string; value?: number | null; invert?: boolean }) {
  const n = metricValue(value);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[9px] font-bold">
        <span className="uppercase tracking-wider text-white/40">{label}</span>
        <span style={{ color: C(n, invert) }}>{n == null ? "—" : formatMetric(n)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${n ?? 0}%`, background: C(n, invert) }} />
      </div>
    </div>
  );
}

const SIGNAL_LABELS: Record<string, string> = {
  ai_generated: "AI-generated visuals",
  deepfake: "Visual deepfake",
  ai_generated_audio: "Synthetic audio",
};

function formatMediaTimestamp(sec?: number | null) {
  if (sec == null || Number.isNaN(sec)) return "—";
  const total = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function signalPercent(value?: number | null) {
  if (value == null) return null;
  return metricValue(Math.max(0, Math.min(1, value)) * 100);
}

function LightMiniBar({ label, value, invert = false }: { label: string; value?: number | null; invert?: boolean }) {
  const pct = signalPercent(value);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] font-bold">
        <span className="uppercase tracking-wider text-ink-faint">{label}</span>
        <span style={{ color: C(pct, invert) }}>{pct == null ? "—" : formatMetricPercent(pct)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full" style={{ width: `${pct ?? 0}%`, background: C(pct, invert) }} />
      </div>
    </div>
  );
}

function MediaIntegrityDetails({ mi }: { mi: any }) {
  if (!mi) return null;
  const signals = mi.signals || {};
  const evidence = mi.deepfake?.manipulation_evidence || mi.evidence || [];
  const dominant = mi.dominant_signal as string | undefined;

  return (
    <div className="space-y-3 text-xs">
      {dominant && (
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <div className="font-bold text-[9px] uppercase tracking-wider text-ink-faint">Primary concern</div>
          <div className="mt-1 font-semibold text-ink">
            {SIGNAL_LABELS[dominant] || dominant.replace(/_/g, " ")}
          </div>
        </div>
      )}
      {(signals.ai_generated || signals.deepfake || signals.ai_generated_audio) && (
        <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
          <div className="font-semibold text-ink">Hive signal breakdown</div>
          <LightMiniBar label={SIGNAL_LABELS.ai_generated} value={signals.ai_generated?.max} invert />
          <LightMiniBar label={SIGNAL_LABELS.deepfake} value={signals.deepfake?.max} invert />
          <LightMiniBar label={SIGNAL_LABELS.ai_generated_audio} value={signals.ai_generated_audio?.max} invert />
        </div>
      )}
      {evidence.length > 0 && (
        <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
          <div className="font-semibold text-ink">Suspicious moments</div>
          <ul className="space-y-1 text-ink-light">
            {evidence.slice(0, 8).map((item: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between gap-3">
                <span className="font-mono text-ink">{formatMediaTimestamp(item.timestamp_sec)}</span>
                <span className="truncate">{SIGNAL_LABELS[item.class] || item.class || "Signal"}</span>
                <span className="font-semibold text-ink">{formatUnitPercent(item.score ?? 0, "0.0%")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {mi.deepfake?.notes && (
        <p className="text-ink-faint italic font-mono">{mi.deepfake.notes}</p>
      )}
      {mi.method && (
        <p className="text-ink-faint">
          Detector: <span className="font-mono text-ink">{mi.method}</span>
          {mi.provider && mi.provider !== mi.method ? ` (${mi.provider})` : ""}
        </p>
      )}
    </div>
  );
}

/* ── Light modal that hosts the full section ── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-line bg-paper p-5 shadow-pop n-fade"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heavy text-lg uppercase tracking-tight text-ink">{title}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-light hover:bg-hover">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AnalysisBento({ video, report, claims, isBusiness, isProduct, onReview }: {
  video: any; report: any; claims: any[]; isBusiness: boolean; isProduct: boolean;
  onReview?: (id: string, status: "approved" | "rejected") => void;
}) {
  const agents = report?.agent_results || {};
  const content = agents.content || {};
  const mode = video?.mode || "verifier";
  const isVerifier = mode === "verifier";
  const scoring = report?.score_reasonings?.scoring_breakdown || {};
  const diagnostics = report?.score_reasonings?.diagnostics || {};
  const ocr = agents.ocr || {};
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const segs = content.segments || [];
  const skippedClaims = agents.fact_check?.skipped_claims || [];
  const verified = claims.filter((c) =>
    c.verdict === "supported" ||
    c.verification_status === "auto_verified" ||
    c.verification_status === "approved"
  ).length;

  const flagged = claims.filter((c) =>
    ["contradicted", "misleading"].includes(c.verdict) ||
    ["contradicted", "rejected"].includes(c.verification_status)
  ).length;

  const perc = agents.perception;
  const bias = agents.bias;
  const comp = agents.compliance;
  const mi = agents.media_integrity;
  const miEvidence = mi?.deepfake?.manipulation_evidence || mi?.evidence || [];
  const cr = agents.creator_risk;
  const senti = agents.sentiment;
  const hashtagCheck = agents.hashtag_check;

  // Determine if speech audio exists (i.e. has words that are not [Music])
  const hasSpeech = segs.length > 0 && segs.some((s: any) => s.text && s.text !== "[Music]");
  const hasVideoSenti = senti?.video_sentiment?.timeline?.length > 0;
  const hasSpeechSenti = senti?.speech_sentiment?.timeline?.length > 0 || senti?.timeline?.length > 0;

  const [sentimentSource, setSentimentSource] = useState<"speech" | "video">("speech");

  useEffect(() => {
    if (!hasSpeech && hasVideoSenti) {
      setSentimentSource("video");
    }
  }, [hasSpeech, hasVideoSenti]);

  const activeSentimentScore = (sentimentSource === "video" && senti?.video_sentiment?.sentiment_score != null)
    ? senti.video_sentiment.sentiment_score
    : report?.sentiment_score;

  const sentimentPct = activeSentimentScore != null ? (activeSentimentScore + 1) * 50 : null;

  const renderModal = () => {
    if (!activeModal) return null;
    let title = "";
    let content: ReactNode = null;

    switch (activeModal) {
      case "Scores":
        title = "Scores";
        content = <ScoresModal report={report} isBusiness={isBusiness} mode={mode} />;
        break;
      case "Summary":
        title = "Summary";
        content = <div className="text-sm leading-relaxed text-ink space-y-3">{formatMarkdown(report.summary)}</div>;
        break;
      case "Fact-check claims":
        title = "Fact-check claims";
        content = <ClaimsPanel claims={claims} skippedClaims={skippedClaims} showVerification={isBusiness} onReview={onReview} />;
        break;
      case "Transcript":
        title = "Transcript";
        content = <TranscriptPanel segments={segs} />;
        break;
      case "On-Screen Text (OCR)":
        title = "On-Screen Text (OCR)";
        content = <TranscriptPanel segments={ocr.ocr_segments} ocr={ocr} />;
        break;
      case "Video Segment Analysis":
        title = "Video Segment Analysis";
        content = <VisualAnalysisModal analysis={ocr.ocr_analysis.video_segment_analysis} />;
        break;
      case "Perception check":
        title = "Perception check";
        content = <PerceptionFull agent={perc} />;
        break;
      case "Bias analysis":
        title = "Bias analysis";
        content = <EvidencePanel title="Bias analysis" agent={bias} />;
        break;
      case "Sentiment timeline":
        title = "Sentiment timeline";
        content = (
          <div className="space-y-4">
            {hasSpeechSenti && hasVideoSenti && (
              <div className="flex gap-1.5 rounded-lg border border-line bg-surface p-0.5 text-xs w-fit">
                <button
                  onClick={() => setSentimentSource("speech")}
                  className={`rounded px-2.5 py-1 font-semibold transition ${sentimentSource === "speech" ? "bg-ink text-paper shadow-sm" : "text-ink-light hover:bg-hover"}`}
                >
                  Speech Audio
                </button>
                <button
                  onClick={() => setSentimentSource("video")}
                  className={`rounded px-2.5 py-1 font-semibold transition ${sentimentSource === "video" ? "bg-ink text-paper shadow-sm" : "text-ink-light hover:bg-hover"}`}
                >
                  Video Visuals
                </button>
              </div>
            )}
            {!hasSpeech && (
              <div className="text-xs text-ink-light font-bold">
                Based on Video Segment Analysis (No speech audio detected)
              </div>
            )}
            <SentimentTimeline timeline={sentimentSource === "speech" ? (senti.speech_sentiment?.timeline || senti.timeline) : (senti.video_sentiment?.timeline || senti.timeline)} />
          </div>
        );
        break;
      case "Product & compliance":
        title = "Product & compliance";
        content = (
          <div className="space-y-4">
            {hashtagCheck && <HashtagCheckPanel hashtagCheck={hashtagCheck} />}
            <EvidencePanel title="Product & compliance" agent={comp} />
          </div>
        );
        break;
      case "Media integrity":
        title = "Media integrity";
        content = <MediaIntegrityDetails mi={mi} />;
        break;
      case "Creator risk":
        title = "Creator risk";
        content = <EvidencePanel title="Creator risk" agent={cr} />;
        break;
      default:
        return null;
    }

    return (
      <Modal title={title} onClose={() => setActiveModal(null)}>
        {content}
      </Modal>
    );
  };

  return (
    <>
      <div className="grid auto-rows-[150px] grid-cols-2 gap-3 lg:grid-cols-4">

        {/* TRUST HERO */}
        <Block label="Trust" icon={<ShieldCheck className="h-3.5 w-3.5" />} color="#0f7b6c" span="col-span-2 row-span-2"
          onClick={() => setActiveModal("Scores")}>
          <div className="flex flex-1 items-center gap-5">
            <Ring value={report?.trust_score ?? null} color={C(report?.trust_score)} label="trust" />
            <div className="flex-1 space-y-2">
              {!isVerifier && <MiniBar label="Risk" value={report?.risk_score} invert />}
              {!isVerifier && isBusiness && <MiniBar label="Compliance" value={report?.compliance_score} />}
              {!isVerifier && <MiniBar label="Sentiment" value={sentimentPct} />}
              {!isVerifier && <MiniBar label="Authenticity" value={report?.authenticity_score} />}
              {isVerifier && <MiniBar label="Evidence coverage" value={scoring?.evidence_coverage} />}
              {isVerifier && <MiniBar label="Confidence factor" value={scoring?.confidence_factor} />}
            </div>
          </div>
          <div className="mt-2 text-[10px] font-medium text-white/40">
            {content.is_about_product ? "Product video" : (content.content_type || "video")}
            {report?.overall_confidence != null && ` · ${formatUnitPercent(report.overall_confidence)} confidence`}
            {(isVerifier || diagnostics?.no_claims_extracted) && diagnostics?.no_claims_extracted && " · insufficient claims"}
          </div>
        </Block>

        {/* SUMMARY */}
        <Block label="Summary" icon={<Sparkle className="h-3.5 w-3.5" />} color="#2383e2" span="col-span-2 row-span-2"
          onClick={report?.summary ? () => setActiveModal("Summary") : undefined}>
          <p className="line-clamp-[12] text-xs leading-relaxed text-white/70 whitespace-pre-line">
            {formatMarkdownInline(report?.summary) || "No summary generated."}
          </p>
        </Block>

        {/* CLAIMS */}
        <Block label="Fact-check claims" icon={<FileSearch className="h-3.5 w-3.5" />} color="#2383e2" span="col-span-2 row-span-2"
          onClick={() => setActiveModal("Fact-check claims")}>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-extrabold text-good">{verified} verified</span>
            <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[10px] font-extrabold text-bad">{flagged} flagged</span>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-extrabold text-white/50">{claims.length} total</span>
            {skippedClaims.length > 0 && (
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-extrabold text-white/40">{skippedClaims.length} filtered</span>
            )}
          </div>
          <div className="space-y-2 flex-1 overflow-hidden">
            {claims.slice(0, 7).map((c, i) => {
              const isVerified = c.verdict === "supported" || c.verification_status === "auto_verified" || c.verification_status === "approved";
              const isContradicted = c.verdict === "contradicted" || c.verification_status === "contradicted" || c.verification_status === "rejected";
              const isMisleading = c.verdict === "misleading";
              return (
                <div key={i} className="flex items-center gap-2 text-[11px] border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  {isVerified ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-good" />
                  ) : (
                    <span className="shrink-0" style={{ color: isContradicted ? "#e03e3e" : isMisleading ? "#cb912f" : "#9b9a97" }}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate text-white/70 flex-1">{c.claim_text}</span>
                </div>
              );
            })}
            {!claims.length && <span className="text-[11px] text-white/30">No claims extracted.</span>}
          </div>
        </Block>

        {/* TRANSCRIPT */}
        <Block label="Transcript" icon={<AudioLines className="h-3.5 w-3.5" />} color="#cb912f" span="col-span-2 row-span-2"
          onClick={() => setActiveModal("Transcript")}>
          <div className="flex-1 space-y-1.5 overflow-hidden">
            {segs.slice(0, 6).map((s: any, i: number) => {
              const col = s.label === "risky" ? "#e03e3e" : s.label === "verify" ? "#cb912f" : "rgba(255,255,255,0.15)";
              return (
                <div key={i} className="border-l-2 pl-2" style={{ borderColor: col }}>
                  <span className="text-[11px] leading-snug text-white/60 line-clamp-1">{s.text}</span>
                </div>
              );
            })}
            {!segs.length && <span className="text-[11px] text-white/30">No transcript.</span>}
          </div>
          <div className="mt-2 text-[10px] font-bold text-white/40">{segs.length} segments · tap to read</div>
        </Block>

        {/* ON-SCREEN TEXT (OCR) */}
        {ocr?.ocr_segments?.length > 0 && (
          <Block
            label="On-Screen Text (OCR)"
            icon={<ScanLine className="h-3.5 w-3.5" />}
            color="#9b59ff"
            span="col-span-2 row-span-2"
            onClick={() => setActiveModal("On-Screen Text (OCR)")}
          >
            {ocr.ocr_analysis && (
              <div className={`mb-2.5 rounded-lg border px-2.5 py-1 text-[10px] max-w-full truncate ${
                ocr.ocr_analysis.relationship_verdict === "unrelated"
                  ? "border-bad/20 bg-bad/5 text-bad"
                  : ocr.ocr_analysis.relationship_verdict === "partially_related"
                  ? "border-warn/20 bg-warn/5 text-warn"
                  : "border-good/20 bg-good/5 text-good"
              }`}>
                <span className="font-extrabold uppercase tracking-wide">
                  Alignment: {ocr.ocr_analysis.relationship_verdict.replace("_", " ")}
                </span>
              </div>
            )}
            <div className="flex-1 space-y-1.5 overflow-hidden">
              {ocr.ocr_segments.slice(0, 6).map((s: any, i: number) => {
                const col = s.label === "risky" ? "#e03e3e" : s.label === "verify" ? "#cb912f" : "rgba(255,255,255,0.15)";
                return (
                  <div key={i} className="border-l-2 pl-2" style={{ borderColor: col }}>
                    <span className="text-[11px] leading-snug text-white/60 line-clamp-1">
                      <span className="font-mono text-[9px] text-white/30 mr-1">{fmt(s.start)}</span>
                      {s.text}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] font-bold text-white/40">{ocr.ocr_segments.length} segments · tap to read</div>
          </Block>
        )}

        {/* VIDEO SEGMENT ANALYSIS (Music + OCR only) */}
        {ocr?.ocr_analysis?.video_segment_analysis?.length > 0 &&
          (ocr.ocr_analysis.relationship_verdict === "unrelated" ||
            ocr.ocr_analysis.relationship_verdict === "partially_related") && (
          <Block
            label="Video Segment Analysis"
            icon={<Eye className="h-3.5 w-3.5" />}
            color="#0f7b6c"
            span="col-span-2 row-span-2"
            onClick={() => setActiveModal("Video Segment Analysis")}
          >
            <div className="text-[10px] text-white/50 mb-3 leading-relaxed">
              Visual action summary for overlay text segments (only music/unrelated speech detected).
            </div>
            <div className="flex-1 space-y-2 overflow-hidden">
              {ocr.ocr_analysis.video_segment_analysis.slice(0, 4).map((item: any, i: number) => (
                <div key={i} className="flex gap-2.5 items-start text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="font-mono text-[9px] text-accent shrink-0 mt-0.5 font-bold bg-accent/15 px-1.5 py-0.5 rounded">
                    {fmt(item.timestamp)}
                  </span>
                  <div className="flex-1 min-w-0">
                    {item.text_appeared && (
                      <span className="text-[10px] font-bold text-white/70 block truncate mb-0.5">
                        "{item.text_appeared}"
                      </span>
                    )}
                    <span className="text-[11px] leading-snug text-white/50 line-clamp-1 block">
                      {item.visual_description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] font-bold text-white/40">
              {ocr.ocr_analysis.video_segment_analysis.length} segments analyzed · tap to inspect
            </div>
          </Block>
        )}

        {/* PERCEPTION */}
        {perc && (
          <Block label="Perception" icon={<Eye className="h-3.5 w-3.5" />} color="#9b59ff" span="col-span-2"
            onClick={() => setActiveModal("Perception check")}>
            <div className="flex items-center gap-3">
              <Ring value={100 - (perc.sentiment_harm_score ?? 0)} color={C(100 - (perc.sentiment_harm_score ?? 0))} size={56} />
              <div className="text-[11px] text-white/60">
                {(perc.flags?.length || 0) > 0
                  ? <span className="font-bold text-warn">{perc.flags.length} sensitivity flag(s)</span>
                  : <span className="font-bold text-good">Unlikely to offend</span>}
                <div className="mt-0.5 text-white/40 line-clamp-2">{perc.audience_perception}</div>
              </div>
            </div>
          </Block>
        )}

        {/* BIAS */}
        {bias && (
          <Block label="Bias & sentiment" icon={<AudioLines className="h-3.5 w-3.5" />} color="#cb912f"
            onClick={() => setActiveModal("Bias analysis")}>
            <div className="flex-1 space-y-2">
              <MiniBar label="Bias" value={report?.bias_score} invert />
              <div className="text-[10px] text-white/40 line-clamp-2">{bias.reasoning}</div>
            </div>
          </Block>
        )}

        {/* SENTIMENT TIMELINE */}
        {((hasSpeechSenti && sentimentSource === "speech") || (hasVideoSenti && sentimentSource === "video")) && (
          <Block
            label="Sentiment timeline"
            icon={<Network className="h-3.5 w-3.5" />}
            color="#2383e2"
            span="col-span-2"
            onClick={() => setActiveModal("Sentiment timeline")}
          >
            <div className="flex flex-col h-full w-full justify-between">
              <div className="flex items-center justify-between mb-2">
                {!hasSpeech ? (
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-good bg-good/10 px-2 py-0.5 rounded">
                    Based on Video Visuals (No speech)
                  </span>
                ) : hasSpeechSenti && hasVideoSenti ? (
                  <div className="flex gap-1 rounded-md border border-white/10 bg-white/5 p-0.5 text-[9px] relative z-20" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSentimentSource("speech")}
                      className={`rounded px-1.5 py-0.5 font-bold transition ${sentimentSource === "speech" ? "bg-white text-ink shadow-sm" : "text-white/60 hover:text-white"}`}
                    >
                      Speech
                    </button>
                    <button
                      onClick={() => setSentimentSource("video")}
                      className={`rounded px-1.5 py-0.5 font-bold transition ${sentimentSource === "video" ? "bg-white text-ink shadow-sm" : "text-white/60 hover:text-white"}`}
                    >
                      Video
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex-1 opacity-90 min-h-[90px]">
                <SentimentTimeline timeline={sentimentSource === "speech" ? (senti.speech_sentiment?.timeline || senti.timeline) : (senti.video_sentiment?.timeline || senti.timeline)} />
              </div>
            </div>
          </Block>
        )}

        {/* COMPLIANCE (business) */}
        {isBusiness && comp && (
          <Block label="Compliance" icon={<Scale className="h-3.5 w-3.5" />} color="#2383e2"
            onClick={() => setActiveModal("Product & compliance")}>
            <div className="flex-1">
              <div className="font-heavy text-3xl" style={{ color: C(report?.compliance_score) }}>{formatMetric(report?.compliance_score)}</div>
              <div className="mt-1 text-[10px] text-white/40">{(comp.issues?.length || 0)} issue(s) flagged</div>
            </div>
          </Block>
        )}

        {/* MEDIA INTEGRITY (business) */}
        {isBusiness && mi && (
          <Block label="Media integrity" icon={<ShieldCheck className="h-3.5 w-3.5" />} color="#0f7b6c"
            onClick={() => setActiveModal("Media integrity")}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-good" />
              <span className="font-heavy text-2xl" style={{ color: C(report?.authenticity_score) }}>{formatMetricPercent(report?.authenticity_score)}</span>
            </div>
            <div className="mt-1 text-[10px] text-white/40">
              authenticity
              {mi.dominant_signal && mi.method === "hive" && (
                <> · {SIGNAL_LABELS[mi.dominant_signal] || mi.dominant_signal}</>
              )}
              {miEvidence.length > 0 && <> · {miEvidence.length} suspicious moment(s)</>}
            </div>
          </Block>
        )}

        {/* CREATOR RISK */}
        {cr && (
          <Block label="Creator risk" icon={<AlertTriangle className="h-3.5 w-3.5" />} color="#cb912f"
            onClick={() => setActiveModal("Creator risk")}>
            <div className="text-[10px] text-white/40 line-clamp-3">{cr.reasoning || `${cr.risks?.length || 0} risk signal(s)`}</div>
          </Block>
        )}
      </div>

      {renderModal()}
    </>
  );
}

/* full perception (light) for modal */
function PerceptionFull({ agent }: { agent: any }) {
  const flags = agent.flags || [];
  return (
    <div className="space-y-3">
      {agent.audience_perception && <p className="text-sm leading-relaxed text-ink-light">{agent.audience_perception}</p>}
      {flags.length ? flags.map((f: any, i: number) => (
        <div key={i} className="rounded-lg border border-warn/20 bg-warn/5 p-3">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-warn" />
            <span className="text-xs font-bold text-ink">{f.affected_group || f.topic}</span>
            <span className="chip ml-auto text-[9px]">{f.severity}</span>
          </div>
          {f.quote && <p className="mb-1 text-xs italic text-ink-faint">"{f.quote}"</p>}
          <p className="text-xs text-ink-light">{f.reason}</p>
        </div>
      )) : (
        <div className="flex items-center gap-2 rounded-lg border border-good/20 bg-good/10 px-3 py-2.5 text-sm text-good">
          <Check className="h-4 w-4" /> Nothing likely to offend or hurt sentiments.
        </div>
      )}
      {agent.recommendations?.length > 0 && (
        <ul className="space-y-1 text-sm text-ink-light">
          {agent.recommendations.map((r: string, i: number) => (
            <li key={i} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScoresModal({ report, isBusiness, mode }: { report: any; isBusiness: boolean; mode: string }) {
  const agents = report?.agent_results || {};
  const isVerifier = mode === "verifier";
  const scoring = report?.score_reasonings?.scoring_breakdown || {};
  const diagnostics = report?.score_reasonings?.diagnostics || {};
  const [activeScore, setActiveScore] = useState<string>("Trust");

  const baseItems = [
    {
      label: "Trust",
      value: report?.trust_score,
      invert: false,
      reasoning: (
        <div className="space-y-3">
          <p className="text-xs text-ink-light leading-relaxed">
            The Trust Score represents the structural reliability of the statements made in the video.
          </p>
          {diagnostics?.no_claims_extracted ? (
            <div className="rounded-lg border border-warn/20 bg-warn/5 p-3 text-xs text-warn">
              Insufficient evidence: no checkable claims survived filtering, so trust cannot be calculated from claim verdicts.
              {diagnostics?.skipped_claim_count > 0 && (
                <span> {diagnostics.skipped_claim_count} candidate phrase(s) were filtered — expand Filtered phrases in the claims panel.</span>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-surface border border-line p-3 text-xs space-y-2">
              <div className="font-semibold text-ink">Scoring Formula:</div>
              <p className="text-ink-light">
                We extract claims and score them: Supported (1.0), Unverified (0.5), Misleading (0.15), and Contradicted (0.0). The base average is penalized by the bias index (up to -30%) and multiplied by the media authenticity score.
              </p>
              {agents.fact_check?.reasoning && (
                <div className="mt-2 pt-2 border-t border-line">
                  <span className="font-bold text-[9px] uppercase tracking-wider text-ink-faint">Model Reasoning:</span>
                  <p className="mt-1 text-ink-light italic">"{agents.fact_check.reasoning}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      label: "Risk",
      value: report?.risk_score,
      invert: true,
      reasoning: (
        <div className="space-y-3">
          <p className="text-xs text-ink-light leading-relaxed">
            The Risk Score calculates the likelihood of guidelines violations, reputational damage, or community backlash.
          </p>
          <div className="rounded-lg bg-surface border border-line p-3 text-xs space-y-2">
            <div className="font-semibold text-ink">Calculation Method:</div>
            <p className="text-ink-light">
              Aggregates Creator Risk signals, framing bias severity, audience sensitivity checks, the percentage of segments flagged as risky by the content agent, and the compliance penalty.
            </p>
            {agents.creator_risk?.reasoning && (
              <div className="mt-2 pt-2 border-t border-line">
                <span className="font-bold text-[9px] uppercase tracking-wider text-ink-faint">Model Reasoning:</span>
                <p className="mt-1 text-ink-light italic">"{agents.creator_risk.reasoning}"</p>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      label: "Compliance",
      value: report?.compliance_score,
      invert: false,
      reasoning: (
        <div className="space-y-3">
          <p className="text-xs text-ink-light leading-relaxed">
            Grades compliance against commercial rules, sponsored disclosure mandates (#ad), and health/financial claim restrictions.
          </p>
          {agents.hashtag_check && <HashtagCheckPanel hashtagCheck={agents.hashtag_check} />}
          <div className="rounded-lg bg-surface border border-line p-3 text-xs space-y-2">
            {agents.compliance?.issues?.length > 0 ? (
              <div className="space-y-2">
                <div className="font-semibold text-bad">Flagged Issues ({agents.compliance.issues.length}):</div>
                <div className="divide-y divide-line max-h-48 overflow-y-auto pr-1">
                  {agents.compliance.issues.map((iss: any, idx: number) => (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0 text-[11px] text-ink-light">
                      <div className="flex items-center gap-1.5 font-bold text-ink">
                        <span className="h-1.5 w-1.5 rounded-full bg-bad animate-pulse" />
                        <span>{iss.issue_type?.replace("_", " ") || "violation"}</span>
                        <span className="ml-auto text-[9px] bg-bad/10 px-1.5 py-0.5 rounded font-extrabold text-bad uppercase">{iss.severity}</span>
                      </div>
                      <p className="mt-0.5">{iss.description}</p>
                      {iss.rule_citation && <p className="text-[9px] text-ink-faint mt-0.5">Citation: {iss.rule_citation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-good font-semibold flex items-center gap-1.5">
                <Check className="h-4 w-4" /> All checked advertising guidelines and disclosures are fully aligned.
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      label: "Sentiment",
      value: report?.sentiment_score != null ? (report.sentiment_score + 1) * 50 : null,
      invert: false,
      reasoning: (
        <div className="space-y-3">
          <p className="text-xs text-ink-light leading-relaxed">
            Sentiment measures the overall emotional tone and excitement index of the speaker.
          </p>
          <div className="rounded-lg bg-surface border border-line p-3 text-xs space-y-2">
            <div className="font-semibold text-ink">Analysis:</div>
            <p className="text-ink-light">
              Monitors emotional intensity throughout the video transcript. Objective, informative reports aim for neutral tone scores, while high emotional peaks are typical of promotional content or sensationalism.
            </p>
            {agents.sentiment?.reasoning && (
              <div className="mt-2 pt-2 border-t border-line">
                <span className="font-bold text-[9px] uppercase tracking-wider text-ink-faint">Model Reasoning:</span>
                <p className="mt-1 text-ink-light italic">"{agents.sentiment.reasoning}"</p>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      label: "Bias",
      value: report?.bias_score,
      invert: true,
      reasoning: (
        <div className="space-y-3">
          <p className="text-xs text-ink-light leading-relaxed">
            Measures political bias, comparative product bias, emotional framing, and exaggeration.
          </p>
          <div className="rounded-lg bg-surface border border-line p-3 text-xs space-y-2">
            <div className="font-semibold text-ink">Analysis details:</div>
            <p className="text-ink-light">
              Looks for hyperbole, one-sided arguments, and loaded terms to gauge narrative balance.
            </p>
            {agents.bias?.reasoning && (
              <div className="mt-2 pt-2 border-t border-line">
                <span className="font-bold text-[9px] uppercase tracking-wider text-ink-faint">Model Reasoning:</span>
                <p className="mt-1 text-ink-light italic">"{agents.bias.reasoning}"</p>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      label: "Authenticity",
      value: report?.authenticity_score,
      invert: false,
      reasoning: (
        <div className="space-y-3">
          <p className="text-xs text-ink-light leading-relaxed">
            Authenticity rates the media file's structural integrity, scanning for deepfakes, synthetic speech, or celebrity cloning.
          </p>
          <div className="rounded-lg bg-surface border border-line p-3 text-xs space-y-2">
            <div className="font-semibold text-ink">Scan details:</div>
            <p className="text-ink-light">
              Scans audio/video layers for splicing anomalies, synthetic voice modulations, and known celebrity face matches.
            </p>
            {agents.media_integrity?.method === "hive" && (
              <MediaIntegrityDetails mi={agents.media_integrity} />
            )}
            {agents.media_integrity?.deepfake?.notes && agents.media_integrity?.method !== "hive" && (
              <div className="mt-2 pt-2 border-t border-line">
                <span className="font-bold text-[9px] uppercase tracking-wider text-ink-faint">Detector Notes:</span>
                <p className="mt-1 text-ink-light italic font-mono">{agents.media_integrity.deepfake.notes}</p>
              </div>
            )}
            {agents.media_integrity?.method && agents.media_integrity?.method !== "hive" && (
              <p className="text-ink-faint">
                Detector: <span className="font-mono text-ink">{agents.media_integrity.method}</span>
                {agents.media_integrity.provider && agents.media_integrity.provider !== agents.media_integrity.method
                  ? ` (${agents.media_integrity.provider})`
                  : ""}
              </p>
            )}
          </div>
        </div>
      )
    }
  ];
  const verifierItems = [
    {
      label: "Trust",
      value: report?.trust_score,
      invert: false,
      reasoning: (
        <div className="space-y-3">
          <div className="rounded-lg bg-surface border border-line p-3 text-xs space-y-1.5">
            <div className="font-semibold text-ink">Verifier Scoring Breakdown</div>
            <p className="text-ink-light">Verdict score: {typeof scoring?.verdict_score === "number" ? formatMetric(scoring.verdict_score) : (scoring?.verdict_score ?? "n/a")} / 100</p>
            <p className="text-ink-light">Evidence coverage: {typeof scoring?.evidence_coverage === "number" ? formatMetricPercent(scoring.evidence_coverage) : `${scoring?.evidence_coverage ?? "n/a"}%`}</p>
            <p className="text-ink-light">Evidence quality: {typeof scoring?.evidence_quality === "number" ? formatMetricPercent(scoring.evidence_quality) : `${scoring?.evidence_quality ?? "n/a"}%`}</p>
            <p className="text-ink-light">Confidence factor: {typeof scoring?.confidence_factor === "number" ? formatMetricPercent(scoring.confidence_factor) : `${scoring?.confidence_factor ?? "n/a"}%`}</p>
            {scoring?.claim_counts && (
              <p className="text-ink-light">
                Claims — supported: {scoring.claim_counts.supported ?? 0}, unverified: {scoring.claim_counts.unverified ?? 0}, misleading: {scoring.claim_counts.misleading ?? 0}, contradicted: {scoring.claim_counts.contradicted ?? 0}
              </p>
            )}
          </div>
          {diagnostics?.no_retrieved_evidence && (
            <p className="text-xs text-warn">No retrieved external evidence for this run.</p>
          )}
          {diagnostics?.used_transcription_stub && (
            <p className="text-xs text-warn">Transcription used stub provider; trust should be treated as low confidence.</p>
          )}
        </div>
      ),
    },
  ];
  const items = isVerifier ? verifierItems : baseItems;

  const activeItem = items.find((i) => i.label === activeScore) || items[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => {
          const n = metricValue(item.value);
          const active = item.label === activeScore;
          return (
            <button
              key={item.label}
              onClick={() => setActiveScore(item.label)}
              className={`rounded-xl border p-3 text-center transition-all duration-200 ${
                active
                  ? "border-accent bg-accent/5 shadow-md scale-[1.02]"
                  : "border-line bg-surface hover:bg-hover hover:border-ink/20"
              }`}
            >
              <div className="font-heavy text-3xl" style={{ color: C(n, item.invert) }}>
                {n == null ? "—" : formatMetric(n)}
              </div>
              <div className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-ink">{item.label}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-line bg-paper p-4 shadow-sm text-left space-y-4">
        <h4 className="font-heavy text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {activeItem.label} Score Details
        </h4>
        {report?.score_reasonings?.[activeItem.label.toLowerCase()] && (
          <div className="rounded-lg bg-accent/[0.03] border border-accent/15 p-3.5 text-xs">
            <div className="font-extrabold text-[9px] uppercase tracking-wider text-accent mb-1.5 flex items-center gap-1">
              <Sparkle className="h-3 w-3 inline-block" /> AI Analysis & Reasoning
            </div>
            <p className="text-ink-light leading-relaxed">
              {report.score_reasonings[activeItem.label.toLowerCase()]}
            </p>
          </div>
        )}
        {activeItem.reasoning}
      </div>
    </div>
  );
}

function VisualAnalysisModal({ analysis }: { analysis: any[] }) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-ink-light leading-relaxed mb-2">
        Detailed AI visual analysis of each segment when text appears on screen.
      </div>
      <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
        {analysis.map((item: any, i: number) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4 flex gap-4">
            <div className="shrink-0 font-mono text-[10px] font-bold text-accent bg-accent/10 h-7 px-2.5 flex items-center justify-center rounded">
              {fmt(item.timestamp)}
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              {item.text_appeared && (
                <div className="text-[10px] font-bold text-ink bg-white/5 px-2 py-0.5 rounded inline-block truncate max-w-full">
                  Text: "{item.text_appeared}"
                </div>
              )}
              <p className="text-xs text-ink-light leading-relaxed">
                {item.visual_description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
