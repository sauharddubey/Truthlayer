"use client";

const verdictStyle: Record<string, string> = {
  supported: "bg-good/10 text-good",
  contradicted: "bg-bad/10 text-bad",
  misleading: "bg-warn/10 text-warn",
  unverified: "bg-surface text-ink-light",
};

const verifyStyle: Record<string, string> = {
  auto_verified: "bg-good/10 text-good",
  approved: "bg-good/10 text-good",
  needs_review: "bg-warn/10 text-warn",
  contradicted: "bg-bad/10 text-bad",
  rejected: "bg-bad/10 text-bad",
  not_applicable: "bg-surface text-ink-faint",
};

export function ClaimsPanel({
  claims,
  showVerification = false,
  onReview,
}: {
  claims: any[];
  showVerification?: boolean;
  onReview?: (claimId: string, status: "approved" | "rejected") => void;
}) {
  if (!claims?.length) return <div className="card text-sm text-ink-light">No factual claims extracted.</div>;
  return (
    <div className="card">
      <div className="mb-3 text-base font-semibold">Claims</div>
      <div className="space-y-2.5">
        {claims.map((c, i) => (
          <div key={i} className="rounded-md border border-line p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink">{c.claim_text}</p>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded px-2 py-0.5 text-xs ${verdictStyle[c.verdict] || verdictStyle.unverified}`}>
                  {c.verdict || "unverified"}
                </span>
                {showVerification && c.verification_status && (
                  <span className={`rounded px-2 py-0.5 text-xs ${verifyStyle[c.verification_status] || "bg-surface text-ink-light"}`}>
                    {c.verification_status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1 text-xs text-ink-faint">
              {c.claim_type}
              {c.confidence != null && ` · ${Math.round(c.confidence * 100)}% conf`}
              {c.evidence_quality_score != null && ` · evidence ${Math.round(c.evidence_quality_score)}%`}
              {c.timestamp_start != null && ` · @${Math.round(c.timestamp_start)}s`}
            </div>
            {c.insufficient_evidence_reasons?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {c.insufficient_evidence_reasons.slice(0, 3).map((reason: string) => (
                  <span key={reason} className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-ink-faint">
                    {reason.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
            {c.verification_note && showVerification && (
              <p className="mt-1 text-xs text-ink-light">{c.verification_note}</p>
            )}
            {c.evidence?.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {c.evidence.slice(0, 3).map((e: any, j: number) => (
                  <li key={j} className="text-xs text-ink-light">
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{e.source || e.url}</a>
                    ) : (<span className="font-medium">{e.source || "evidence"}</span>)}
                    {e.text && <span> — {e.text}</span>}
                  </li>
                ))}
              </ul>
            )}
            {showVerification && onReview && c.verification_status === "needs_review" && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => onReview(c.id, "approved")} className="rounded-md bg-good/10 px-2.5 py-1 text-xs font-medium text-good hover:bg-good/20">Approve</button>
                <button onClick={() => onReview(c.id, "rejected")} className="rounded-md bg-bad/10 px-2.5 py-1 text-xs font-medium text-bad hover:bg-bad/20">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
