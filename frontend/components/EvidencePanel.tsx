"use client";

export function EvidencePanel({ title, agent }: { title: string; agent: any }) {
  const confidence = agent.confidence != null ? Math.round(agent.confidence * 100) : null;
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-base font-semibold">{title}</div>
        {confidence != null && <span className="chip">{confidence}% conf</span>}
      </div>
      {agent.reasoning && <p className="text-sm leading-relaxed text-ink-light">{agent.reasoning}</p>}

      {agent.detected && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(agent.detected).filter(([, v]) => v).map(([k]) => (
            <span key={k} className="rounded bg-warn/10 px-2 py-0.5 text-xs text-warn">{k.replace(/_/g, " ")}</span>
          ))}
        </div>
      )}
      {agent.risks?.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-ink-light">
          {agent.risks.map((r: any, i: number) => (
            <li key={i}><span className="font-medium text-ink">[{r.severity}] {r.type}</span> — {r.description}</li>
          ))}
        </ul>
      )}
      {agent.issues?.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-ink-light">
          {agent.issues.map((r: any, i: number) => (
            <li key={i}>
              <span className="font-medium text-ink">[{r.severity}] {r.issue_type}</span> — {r.description}
              {r.rule_citation && <span className="block text-xs text-ink-faint">rule: {r.rule_citation}</span>}
            </li>
          ))}
        </ul>
      )}
      {agent.recommendations?.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-ink-light">Recommendations</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-light">
            {agent.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {agent.deepfake && (
        <div className="mt-2 rounded-md bg-surface p-2.5 text-sm text-ink-light">
          Deepfake probability <b className="text-ink">{Math.round(agent.deepfake.probability_score * 100)}%</b> ·
          authenticity <b className="text-ink">{Math.round(agent.deepfake.authenticity_score * 100)}%</b>
        </div>
      )}
    </div>
  );
}
