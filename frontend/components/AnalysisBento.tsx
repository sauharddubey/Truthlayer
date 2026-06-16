"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { ClaimsPanel } from "@/components/ClaimsPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SentimentTimeline } from "@/components/SentimentTimeline";
import { Check, AlertTriangle, FileSearch, Eye, Scale, ShieldCheck, AudioLines, Network, Sparkle, ArrowRight } from "@/components/icons";

const C = (t?: number | null, invert = false) => {
  if (t == null) return "#9b9a97";
  const v = invert ? 100 - t : t;
  return v >= 70 ? "#0f7b6c" : v >= 40 ? "#cb912f" : "#e03e3e";
};

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

function Ring({ value, color, size = 92, label }: { value: number; color: string; size?: number; label?: string }) {
  const r = size / 2 - 7, circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heavy text-2xl text-white leading-none">{Math.round(value)}</span>
        {label && <span className="text-[7px] font-bold uppercase tracking-widest text-white/40 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

function MiniBar({ label, value, invert = false }: { label: string; value?: number | null; invert?: boolean }) {
  const n = value == null ? null : Math.round(value);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[9px] font-bold">
        <span className="uppercase tracking-wider text-white/40">{label}</span>
        <span style={{ color: C(n, invert) }}>{n ?? "—"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${n ?? 0}%`, background: C(n, invert) }} />
      </div>
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
  const [modal, setModal] = useState<{ title: string; node: ReactNode } | null>(null);
  const open = (title: string, node: ReactNode) => setModal({ title, node });

  const segs = content.segments || [];
  const verified = claims.filter((c) => c.verdict === "supported").length;
  const flagged = claims.filter((c) => ["contradicted", "misleading"].includes(c.verdict)).length;
  const sentimentPct = report?.sentiment_score != null ? (report.sentiment_score + 1) * 50 : null;
  const perc = agents.perception;
  const bias = agents.bias;
  const comp = agents.compliance;
  const mi = agents.media_integrity;
  const cr = agents.creator_risk;
  const senti = agents.sentiment;

  return (
    <>
      <div className="grid auto-rows-[150px] grid-cols-2 gap-3 lg:grid-cols-4">

        {/* TRUST HERO */}
        <Block label="Trust" icon={<ShieldCheck className="h-3.5 w-3.5" />} color="#0f7b6c" span="col-span-2 row-span-2"
          onClick={() => open("Scores", <ScoresModal report={report} isBusiness={isBusiness} />)}>
          <div className="flex flex-1 items-center gap-5">
            <Ring value={report?.trust_score ?? 0} color={C(report?.trust_score)} label="trust" />
            <div className="flex-1 space-y-2">
              <MiniBar label="Risk" value={report?.risk_score} invert />
              {isBusiness && <MiniBar label="Compliance" value={report?.compliance_score} />}
              <MiniBar label="Sentiment" value={sentimentPct} />
              <MiniBar label="Authenticity" value={report?.authenticity_score} />
            </div>
          </div>
          <div className="mt-2 text-[10px] font-medium text-white/40">
            {content.is_about_product ? "Product video" : (content.content_type || "video")}
            {report?.overall_confidence != null && ` · ${Math.round(report.overall_confidence * 100)}% confidence`}
          </div>
        </Block>

        {/* SUMMARY */}
        <Block label="Summary" icon={<Sparkle className="h-3.5 w-3.5" />} color="#2383e2" span="col-span-2"
          onClick={report?.summary ? () => open("Summary", <p className="text-sm leading-relaxed text-ink">{report.summary}</p>) : undefined}>
          <p className="line-clamp-4 text-xs leading-relaxed text-white/70">{report?.summary || "No summary generated."}</p>
        </Block>

        {/* CLAIMS */}
        <Block label="Fact-check claims" icon={<FileSearch className="h-3.5 w-3.5" />} color="#2383e2" span="col-span-2"
          onClick={() => open("Fact-check claims", <ClaimsPanel claims={claims} showVerification={isBusiness} onReview={onReview} />)}>
          <div className="mb-2 flex gap-2">
            <span className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-extrabold text-good">{verified} verified</span>
            <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[10px] font-extrabold text-bad">{flagged} flagged</span>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-extrabold text-white/50">{claims.length} total</span>
          </div>
          <div className="space-y-1">
            {claims.slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                {c.verdict === "supported"
                  ? <Check className="h-3 w-3 shrink-0 text-good" />
                  : <span className="shrink-0" style={{ color: C(c.verdict === "contradicted" ? 0 : 50) }}><AlertTriangle className="h-3 w-3" /></span>}
                <span className="truncate text-white/60">{c.claim_text}</span>
              </div>
            ))}
            {!claims.length && <span className="text-[11px] text-white/30">No claims extracted.</span>}
          </div>
        </Block>

        {/* TRANSCRIPT */}
        <Block label="Transcript" icon={<AudioLines className="h-3.5 w-3.5" />} color="#cb912f" span="col-span-2 row-span-2"
          onClick={() => open("Transcript", <TranscriptPanel segments={segs} />)}>
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

        {/* PERCEPTION */}
        {perc && (
          <Block label="Perception" icon={<Eye className="h-3.5 w-3.5" />} color="#9b59ff" span="col-span-2"
            onClick={() => open("Perception check", <PerceptionFull agent={perc} />)}>
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
            onClick={() => open("Bias analysis", <EvidencePanel title="Bias analysis" agent={bias} />)}>
            <div className="flex-1 space-y-2">
              <MiniBar label="Bias" value={report?.bias_score} invert />
              <div className="text-[10px] text-white/40 line-clamp-2">{bias.reasoning}</div>
            </div>
          </Block>
        )}

        {/* SENTIMENT TIMELINE */}
        {senti?.timeline?.length > 0 && (
          <Block label="Sentiment timeline" icon={<Network className="h-3.5 w-3.5" />} color="#2383e2" span="col-span-2"
            onClick={() => open("Sentiment timeline", <SentimentTimeline timeline={senti.timeline} />)}>
            <div className="flex-1 opacity-90"><SentimentTimeline timeline={senti.timeline} /></div>
          </Block>
        )}

        {/* COMPLIANCE (business) */}
        {isBusiness && comp && (
          <Block label="Compliance" icon={<Scale className="h-3.5 w-3.5" />} color="#2383e2"
            onClick={() => open("Product & compliance", <EvidencePanel title="Product & compliance" agent={comp} />)}>
            <div className="flex-1">
              <div className="font-heavy text-3xl" style={{ color: C(report?.compliance_score) }}>{report?.compliance_score ?? "—"}</div>
              <div className="mt-1 text-[10px] text-white/40">{(comp.issues?.length || 0)} issue(s) flagged</div>
            </div>
          </Block>
        )}

        {/* MEDIA INTEGRITY (business) */}
        {isBusiness && mi && (
          <Block label="Media integrity" icon={<ShieldCheck className="h-3.5 w-3.5" />} color="#0f7b6c"
            onClick={() => open("Media integrity", <EvidencePanel title="Media integrity" agent={mi} />)}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-good" />
              <span className="font-heavy text-2xl" style={{ color: C(report?.authenticity_score) }}>{report?.authenticity_score ?? "—"}%</span>
            </div>
            <div className="mt-1 text-[10px] text-white/40">authenticity</div>
          </Block>
        )}

        {/* CREATOR RISK */}
        {cr && (
          <Block label="Creator risk" icon={<AlertTriangle className="h-3.5 w-3.5" />} color="#cb912f"
            onClick={() => open("Creator risk", <EvidencePanel title="Creator risk" agent={cr} />)}>
            <div className="text-[10px] text-white/40 line-clamp-3">{cr.reasoning || `${cr.risks?.length || 0} risk signal(s)`}</div>
          </Block>
        )}
      </div>

      {modal && <Modal title={modal.title} onClose={() => setModal(null)}>{modal.node}</Modal>}
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

function ScoresModal({ report, isBusiness }: { report: any; isBusiness: boolean }) {
  const items: [string, number | null, boolean][] = [
    ["Trust", report?.trust_score, false],
    ["Risk", report?.risk_score, true],
    ["Compliance", report?.compliance_score, false],
    ["Sentiment", report?.sentiment_score != null ? (report.sentiment_score + 1) * 50 : null, false],
    ["Bias", report?.bias_score, true],
    ["Authenticity", report?.authenticity_score, false],
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(([l, v, inv]) => {
        const n = v == null ? null : Math.round(v);
        return (
          <div key={l} className="rounded-xl border border-line bg-surface p-3 text-center">
            <div className="font-heavy text-3xl" style={{ color: C(n, inv) }}>{n ?? "—"}</div>
            <div className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-ink-faint">{l}</div>
          </div>
        );
      })}
    </div>
  );
}
