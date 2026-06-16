"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getMe, updateSettings, getUsage } from "@/lib/api";
import { Check, Sparkle, FileSearch, AudioLines, Network } from "@/components/icons";

/* ── Tiny SVG bar chart ───────────────────────────────────────────────────── */
function MiniBarChart({ data }: { data: Array<{ day: string; total_tokens: number; cost_usd: number }> }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-28 text-xs text-ink-faint">No activity in the last 30 days</div>
  );
  const maxTokens = Math.max(...data.map((d) => d.total_tokens), 1);
  const today = new Date().toISOString().slice(0, 10);

  // Build a full 30-day window even for sparse data
  const days: typeof data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = data.find((r) => r.day === key);
    days.push(found ?? { day: key, total_tokens: 0, cost_usd: 0 });
  }

  return (
    <div className="flex items-end gap-0.5 h-28 w-full">
      {days.map((d) => {
        const h = Math.max((d.total_tokens / maxTokens) * 100, d.total_tokens > 0 ? 4 : 0);
        const isToday = d.day === today;
        return (
          <div key={d.day} className="group relative flex-1 flex flex-col items-center justify-end h-full">
            <div
              className={`w-full rounded-t-sm transition-all duration-300 ${isToday ? "bg-accent" : "bg-accent/30 group-hover:bg-accent/60"}`}
              style={{ height: `${h}%`, minHeight: d.total_tokens > 0 ? 3 : 0 }}
            />
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 hidden group-hover:flex flex-col items-center">
              <div className="bg-ink text-paper text-[9px] font-semibold px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                <div>{d.day.slice(5)}</div>
                <div>{d.total_tokens.toLocaleString()} tok</div>
                {d.cost_usd > 0 && <div>${d.cost_usd.toFixed(4)}</div>}
              </div>
              <div className="w-1.5 h-1.5 bg-ink rotate-45 -mt-0.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Call type icon ───────────────────────────────────────────────────────── */
function CallTypeIcon({ type }: { type: string }) {
  if (type === "embed") return <Network className="h-3.5 w-3.5 text-warn" />;
  if (type === "transcription") return <AudioLines className="h-3.5 w-3.5 text-good" />;
  return <FileSearch className="h-3.5 w-3.5 text-accent" />;
}

/* ── Stat tile ────────────────────────────────────────────────────────────── */
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="text-[9px] font-extrabold uppercase tracking-widest text-ink-faint mb-1">{label}</div>
      <div className="font-heavy text-3xl text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-ink-faint">{sub}</div>}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [hasKey, setHasKey]   = useState(false);
  const [value, setValue]     = useState("");
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage]     = useState<Awaited<ReturnType<typeof getUsage>> | null>(null);
  const [usageErr, setUsageErr] = useState("");

  useEffect(() => {
    getMe().then((u) => setHasKey(!!u.has_api_key)).catch(() => {});
    getUsage().then(setUsage).catch((e) => setUsageErr(e.message));
  }, []);

  async function save() {
    setLoading(true); setError(""); setSaved(false);
    try {
      const u = await updateSettings(value);
      setHasKey(!!u.has_api_key);
      setValue("");
      setSaved(true);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const fmtTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` : `${n}`;

  const fmtCost = (usd: number) =>
    usd === 0 ? "$0.00" :
    usd < 0.001 ? `$${(usd * 1000).toFixed(3)}m` :
    `$${usd.toFixed(4)}`;

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl space-y-8">

        {/* ── Usage dashboard ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10">
              <Sparkle className="h-3.5 w-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-widest">AI Usage & Costs</h2>
          </div>

          {usageErr ? (
            <div className="rounded-lg border border-bad/20 bg-bad/10 px-4 py-3 text-sm text-bad">{usageErr}</div>
          ) : !usage ? (
            <div className="flex items-center gap-2 text-sm text-ink-faint py-4">
              <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              Loading usage data…
            </div>
          ) : (
            <div className="space-y-5">

              {/* Stat row */}
              <div className="grid grid-cols-3 gap-3">
                <Stat
                  label="Total tokens"
                  value={fmtTokens(usage.total_tokens)}
                  sub="all time"
                />
                <Stat
                  label="Estimated cost"
                  value={fmtCost(usage.total_cost_usd)}
                  sub={usage.total_cost_usd === 0 ? "free tier" : "USD all time"}
                />
                <Stat
                  label="API calls"
                  value={usage.total_calls.toLocaleString()}
                  sub="chat + embed + transcription"
                />
              </div>

              {/* 30-day chart */}
              <div className="rounded-xl border border-line bg-paper p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-ink-faint">Token usage — last 30 days</div>
                  {usage.daily.length > 0 && (
                    <span className="text-[9px] font-semibold text-ink-faint">
                      {fmtTokens(usage.daily.reduce((s, d) => s + d.total_tokens, 0))} this month
                    </span>
                  )}
                </div>
                <MiniBarChart data={usage.daily} />
                <div className="flex justify-between mt-1 text-[9px] text-ink-faint">
                  <span>30 days ago</span><span>Today</span>
                </div>
              </div>

              {/* Per-model breakdown */}
              {usage.by_model.length > 0 && (
                <div className="rounded-xl border border-line bg-paper overflow-hidden">
                  <div className="px-4 py-3 border-b border-line">
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-ink-faint">Breakdown by model</div>
                  </div>
                  <div className="divide-y divide-line">
                    {usage.by_model.map((m, i) => {
                      const totalAll = usage.total_tokens || 1;
                      const pct = Math.round((m.total_tokens / totalAll) * 100);
                      return (
                        <div key={i} className="px-4 py-3 hover:bg-surface transition-colors">
                          <div className="flex items-center gap-2.5 mb-2">
                            <CallTypeIcon type={m.call_type} />
                            <span className="text-xs font-semibold text-ink font-mono flex-1 truncate">{m.model}</span>
                            <span className="text-[9px] font-bold text-ink-faint bg-surface border border-line px-2 py-0.5 rounded-full uppercase">{m.call_type}</span>
                          </div>
                          {/* Token bar */}
                          <div className="h-1 rounded-full bg-surface overflow-hidden mb-2">
                            <div className="h-full rounded-full bg-accent/40" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex gap-4 text-[10px] text-ink-faint">
                            <span><b className="text-ink">{fmtTokens(m.prompt_tokens)}</b> prompt</span>
                            <span><b className="text-ink">{fmtTokens(m.completion_tokens)}</b> completion</span>
                            <span><b className="text-ink">{m.calls}</b> calls</span>
                            <span className="ml-auto font-semibold" style={{ color: m.cost_usd > 0 ? "#cb912f" : "#0f7b6c" }}>
                              {fmtCost(m.cost_usd)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-3 bg-surface border-t border-line flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-ink-faint">Total</span>
                    <div className="flex gap-6 text-xs">
                      <span className="text-ink-faint"><b className="text-ink">{fmtTokens(usage.total_tokens)}</b> tokens</span>
                      <span className="font-bold" style={{ color: usage.total_cost_usd > 0 ? "#cb912f" : "#0f7b6c" }}>
                        {fmtCost(usage.total_cost_usd)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {usage.by_model.length === 0 && (
                <div className="rounded-xl border border-dashed border-line py-10 text-center">
                  <FileSearch className="mx-auto mb-2 h-7 w-7 text-ink-faint" />
                  <p className="text-sm font-semibold text-ink">No usage yet</p>
                  <p className="text-xs text-ink-faint mt-1">Usage will appear here after your first video analysis.</p>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="h-px bg-line" />

        {/* ── API Key ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface border border-line">
              <Sparkle className="h-3.5 w-3.5 text-ink-faint" />
            </div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-widest">OpenRouter API key</h2>
          </div>

          <div className="card space-y-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-ink-light leading-relaxed">
                All AI runs through OpenRouter. Add your own key to use your own credits and remove the platform usage limit.
                Leave blank to use the platform&apos;s shared key.
              </p>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
                  hasKey ? "border-good/25 bg-good/10 text-good" : "border-line bg-surface text-ink-faint"
                }`}
              >
                {hasKey ? <><Check className="h-3 w-3" /> Personal key</> : "Platform key"}
              </span>
            </div>

            <div>
              <label className="label">Your OpenRouter key</label>
              <input
                className="input font-mono"
                type="password"
                placeholder="sk-or-v1-…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                Get a key at{" "}
                <a className="text-accent hover:underline" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
                  openrouter.ai/keys
                </a>.{" "}
                Save empty to revert to the platform default.
              </p>
            </div>

            {error && <div className="rounded-lg border border-bad/20 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
            {saved && (
              <div className="rounded-lg border border-good/20 bg-good/10 px-3 py-2 text-sm text-good flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Saved successfully.
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button className="btn-accent" onClick={save} disabled={loading}>
                {loading ? "Saving…" : "Save key"}
              </button>
              {hasKey && (
                <button className="btn-ghost" onClick={() => { setValue(""); save(); }} disabled={loading}>
                  Remove key
                </button>
              )}
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
