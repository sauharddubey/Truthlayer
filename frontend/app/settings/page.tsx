"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getMe, updateSettings, getUsage } from "@/lib/api";
import { Check, Sparkle, FileSearch, AudioLines, Network, Layers, ChevronDown } from "@/components/icons";

const DEFAULT_LLM_MODELS = [
  { id: "openai/gpt-oss-120b:free", name: "GPT-OSS-120B (Free Default)" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B Instruct (Free)" },
];

const DEFAULT_EMBEDDING_MODELS = [
  { id: "openai/text-embedding-3-small", name: "Text Embedding 3 Small (Default)" },
  { id: "openai/text-embedding-3-large", name: "Text Embedding 3 Large" },
];

/** Per-token USD pricing pulled from OpenRouter. */
type ModelPricing = { prompt: number; completion: number; audio: number };
type ModelOption = { id: string; name: string; pricing?: ModelPricing };

const DEFAULT_TRANSCRIPTION_MODELS: ModelOption[] = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite (Default)" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
];

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
  const [user, setUser]       = useState<any>(null);
  const [hasKey, setHasKey]   = useState(false);
  const [value, setValue]     = useState("");
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage]     = useState<Awaited<ReturnType<typeof getUsage>> | null>(null);
  const [usageErr, setUsageErr] = useState("");

  // Model selection states
  const [llmVal, setLlmVal] = useState("");
  const [embedVal, setEmbedVal] = useState("");
  const [transcriptionVal, setTranscriptionVal] = useState("");
  const [savingModels, setSavingModels] = useState(false);
  const [savedModels, setSavedModels] = useState(false);
  const [modelsError, setModelsError] = useState("");

  // Model lists
  const [llmModels, setLlmModels] = useState<{ id: string; name: string }[]>(DEFAULT_LLM_MODELS);
  const [embedModels, setEmbedModels] = useState<{ id: string; name: string }[]>(DEFAULT_EMBEDDING_MODELS);
  const [transcriptionModels, setTranscriptionModels] = useState<ModelOption[]>(DEFAULT_TRANSCRIPTION_MODELS);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        setHasKey(!!u.has_api_key);
        setLlmVal(u.llm_model || "");
        setEmbedVal(u.embeddings_model || "");
        setTranscriptionVal(u.transcription_model || "");
      })
      .catch(() => {});

    getUsage().then(setUsage).catch((e) => setUsageErr(e.message));

    // Fetch OpenRouter models dynamically
    fetch("https://openrouter.ai/api/v1/models")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          const all: any[] = data.data;

          const llms = all
            .filter((m) => !m.id.includes("embed"))
            .map((m) => ({ id: m.id, name: m.name || m.id }));

          const embeds = all
            .filter((m) => m.id.includes("embed"))
            .map((m) => ({ id: m.id, name: m.name || m.id }));

          // Only models that accept audio as an input modality can transcribe.
          // (matches https://openrouter.ai/models?input_modalities=audio)
          const transcriptions: ModelOption[] = all
            .filter((m) => m.architecture?.input_modalities?.includes("audio"))
            .map((m) => ({
              id: m.id,
              name: m.name || m.id,
              pricing: m.pricing
                ? {
                    prompt: parseFloat(m.pricing.prompt) || 0,
                    completion: parseFloat(m.pricing.completion) || 0,
                    audio: parseFloat(m.pricing.audio) || 0,
                  }
                : undefined,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          const mergeModels = (defaults: typeof DEFAULT_LLM_MODELS, fetched: typeof DEFAULT_LLM_MODELS) => {
            const seen = new Set(defaults.map((d) => d.id));
            const merged = [...defaults];
            for (const item of fetched) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
              }
            }
            return merged;
          };

          setLlmModels(mergeModels(DEFAULT_LLM_MODELS, llms));
          setEmbedModels(mergeModels(DEFAULT_EMBEDDING_MODELS, embeds));
          if (transcriptions.length) setTranscriptionModels(transcriptions);
        }
      })
      .catch((err) => console.error("Failed to fetch OpenRouter models:", err));
  }, []);

  async function save() {
    setLoading(true); setError(""); setSaved(false);
    try {
      const u = await updateSettings({ openrouter_api_key: value });
      setHasKey(!!u.has_api_key);
      setValue("");
      setSaved(true);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function saveModelsConfig() {
    setSavingModels(true); setModelsError(""); setSavedModels(false);
    try {
      const u = await updateSettings({
        llm_model: llmVal || "",
        embeddings_model: embedVal || "",
        transcription_model: transcriptionVal || "",
      });
      setUser(u);
      setSavedModels(true);
    } catch (e: any) { setModelsError(e.message); } finally { setSavingModels(false); }
  }

  const fmtTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` : `${n}`;

  const fmtCost = (usd: number) =>
    usd === 0 ? "$0.00" :
    usd < 0.001 ? `$${(usd * 1000).toFixed(3)}m` :
    `$${usd.toFixed(4)}`;

  // OpenRouter pricing is per-token USD; show it per 1M tokens for readability.
  const fmtPerM = (perToken: number) => {
    const perM = perToken * 1_000_000;
    if (perM === 0) return "Free";
    return perM < 1 ? `$${perM.toFixed(3)}` : `$${perM.toFixed(2)}`;
  };

  const selectedTranscription = transcriptionModels.find((m) => m.id === transcriptionVal);
  const tPricing = selectedTranscription?.pricing;

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

        <div className="h-px bg-line" />

        {/* ── Model Stack Configuration ───────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10">
              <Layers className="h-3.5 w-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-widest">Model Stack Configuration</h2>
          </div>

          <div className="card space-y-5">
            <p className="text-sm text-ink-light leading-relaxed">
              Customize the specific OpenRouter AI models used for your video intelligence runs. 
              Leave selection blank to use default platform routing.
            </p>

            {/* Chat LLM / Reasoning Select */}
            <div>
              <label className="label flex items-center gap-1.5 mb-1.5">
                <Sparkle className="h-3.5 w-3.5 text-accent" />
                Chat LLM (Reasoning &amp; Agents)
              </label>
              <div className="relative">
                <select
                  className="input pr-10 appearance-none font-mono"
                  value={llmVal}
                  onChange={(e) => setLlmVal(e.target.value)}
                >
                  <option value="">Platform Default (GPT-OSS-120B / GPT-4o Mini)</option>
                  {llmModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-faint">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                Runs fact-checking, compliance, narrative, bias, and sentiment agents.
              </p>
            </div>

            {/* Transcription Select */}
            <div>
              <label className="label flex items-center gap-1.5 mb-1.5">
                <AudioLines className="h-3.5 w-3.5 text-good" />
                Audio Transcription (Speech-to-Text)
              </label>
              <div className="relative">
                <select
                  className="input pr-10 appearance-none font-mono"
                  value={transcriptionVal}
                  onChange={(e) => setTranscriptionVal(e.target.value)}
                >
                  <option value="">Platform Default (Gemini 2.5 Flash Lite)</option>
                  {transcriptionModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                      {m.pricing ? ` — in ${fmtPerM(m.pricing.prompt)} / out ${fmtPerM(m.pricing.completion)} per 1M` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-faint">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                Only models that accept audio input on OpenRouter are listed (e.g. Gemini, GPT-Audio, Voxtral).
              </p>

              {/* Selected-model cost breakdown */}
              {selectedTranscription && (
                <div className="mt-3 rounded-xl border border-line bg-paper p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-ink-faint">Estimated cost · per 1M tokens</div>
                    <span className="text-[9px] font-semibold text-ink-faint font-mono truncate max-w-[45%]">{selectedTranscription.id}</span>
                  </div>
                  {tPricing ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
                          <div className="text-[8px] font-extrabold uppercase tracking-widest text-ink-faint">Text in</div>
                          <div className="font-heavy text-sm text-ink">{fmtPerM(tPricing.prompt)}</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
                          <div className="text-[8px] font-extrabold uppercase tracking-widest text-ink-faint">Audio in</div>
                          <div className="font-heavy text-sm text-ink">{fmtPerM(tPricing.audio)}</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
                          <div className="text-[8px] font-extrabold uppercase tracking-widest text-ink-faint">Text out</div>
                          <div className="font-heavy text-sm text-ink">{fmtPerM(tPricing.completion)}</div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
                        <span className="text-[10px] font-semibold text-ink-light">Combined (audio in + text out)</span>
                        <span className="font-bold text-sm" style={{ color: tPricing.audio + tPricing.completion > 0 ? "#cb912f" : "#0f7b6c" }}>
                          {fmtPerM(tPricing.audio + tPricing.completion)} <span className="text-[10px] font-normal text-ink-faint">/ 1M tok</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-ink-faint">Live pricing unavailable for this model.</p>
                  )}
                </div>
              )}
            </div>

            {/* Vector Embeddings Select (Only for BUSINESS tier users who have product RAG features) */}
            {user?.role === "business" && (
              <div>
                <label className="label flex items-center gap-1.5 mb-1.5">
                  <Network className="h-3.5 w-3.5 text-warn" />
                  Vector Embeddings (RAG Retrieval)
                </label>
                <div className="relative">
                  <select
                    className="input pr-10 appearance-none font-mono"
                    value={embedVal}
                    onChange={(e) => setEmbedVal(e.target.value)}
                  >
                    <option value="">Platform Default (Text Embedding 3 Small)</option>
                    {embedModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-faint">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-ink-faint">
                  Used for parsing and searching your brand knowledge base (marketing guidelines, product details).
                </p>
              </div>
            )}

            {savedModels && (
              <div className="rounded-lg border border-good/20 bg-good/10 px-3 py-2 text-sm text-good flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Saved successfully.
              </div>
            )}
            {modelsError && <div className="rounded-lg border border-bad/20 bg-bad/10 px-3 py-2 text-sm text-bad">{modelsError}</div>}

            <div className="flex gap-2.5 pt-1">
              <button className="btn-accent" onClick={saveModelsConfig} disabled={savingModels}>
                {savingModels ? "Saving…" : "Save model stack"}
              </button>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
