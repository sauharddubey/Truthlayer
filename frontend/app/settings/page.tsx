"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getMe, updateSettings, getUsage, deleteAccount, switchRole, routeForRole } from "@/lib/api";
import { Check, Sparkle, FileSearch, AudioLines, Network, Layers, ChevronDown, Box, Eye, Scale, Lock } from "@/components/icons";

const WORKSPACES = [
  { value: "business", label: "Business", desc: "Compliance, influencer vetting & brand narrative monitoring", icon: <Box className="h-4 w-4" /> },
  { value: "creator", label: "Creator", desc: "Self-check videos pre-publication to prevent cancellation", icon: <Eye className="h-4 w-4" /> },
  { value: "verifier", label: "Verifier", desc: "Fact-check any public video with live evidence citations", icon: <Scale className="h-4 w-4" /> },
];

const DEFAULT_LLM_MODELS = [
  { id: "openai/gpt-oss-120b:free", name: "GPT-OSS-120B (Free Default)" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B Instruct (Free)" },
];

// Only 1536-dimension models: the pgvector column is fixed at EMBEDDINGS_DIM
// (1536) on first run, so text-embedding-3-large (3072-dim) would fail.
const DEFAULT_EMBEDDING_MODELS = [
  { id: "openai/text-embedding-3-small", name: "Text Embedding 3 Small (1536-dim · Default)" },
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

/* ── Small labelled key input (optional service keys) ───────────────────────── */
function KeyField({
  id, label, badge, hint, placeholder, value, onChange, onRemove, canRemove, loading,
}: {
  id: string; label: string; badge: boolean; hint: string; placeholder: string;
  value: string; onChange: (v: string) => void; onRemove: () => void;
  canRemove: boolean; loading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label" htmlFor={id}>{label}</label>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${badge ? "text-good" : "text-ink-faint"}`}>
          {badge ? "Set" : "Not set"}
        </span>
      </div>
      <input
        id={id}
        className="input font-mono"
        type="password"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-ink-faint">{hint}</p>
        {canRemove && (
          <button className="text-xs text-bad hover:underline" onClick={onRemove} disabled={loading}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [user, setUser]       = useState<any>(null);
  const [hasKey, setHasKey]   = useState(false);
  const [value, setValue]     = useState("");
  // Optional per-user service keys.
  const [hasTavily, setHasTavily] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);
  const [tavilyVal, setTavilyVal] = useState("");
  const [mediaVal, setMediaVal] = useState("");
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage]     = useState<Awaited<ReturnType<typeof getUsage>> | null>(null);
  const [usageErr, setUsageErr] = useState("");

  // Workspace / role switching.
  const [switching, setSwitching] = useState<string | null>(null);
  const [roleError, setRoleError] = useState("");

  // Model selection states
  const [llmVal, setLlmVal] = useState("");
  const [embedVal, setEmbedVal] = useState("");
  const [transcriptionVal, setTranscriptionVal] = useState("");
  const [savingModels, setSavingModels] = useState(false);
  const [savedModels, setSavedModels] = useState(false);
  const [modelsError, setModelsError] = useState("");

  // Model lists
  const [llmModels, setLlmModels] = useState<{ id: string; name: string }[]>(DEFAULT_LLM_MODELS);
  const [transcriptionModels, setTranscriptionModels] = useState<ModelOption[]>(DEFAULT_TRANSCRIPTION_MODELS);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        setHasKey(!!u.has_api_key);
        setHasTavily(!!u.has_tavily_key);
        setHasMedia(!!u.has_media_integrity_key);
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

          // Chat LLM must accept text in and produce text out. This excludes
          // embedding models, audio-only transcription models, and image
          // generation models — none of which can run the reasoning agents.
          const llms = all
            .filter((m) => {
              const inMod: string[] = m.architecture?.input_modalities || [];
              const outMod: string[] = m.architecture?.output_modalities || [];
              return (
                inMod.includes("text") &&
                (outMod.length === 0 || outMod.includes("text")) &&
                !m.id.includes("embed")
              );
            })
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
          // Embeddings are intentionally NOT populated from the live list: the
          // pgvector column width is fixed at EMBEDDINGS_DIM (1536) on first run,
          // so only dimension-1536 models work. DEFAULT_EMBEDDING_MODELS holds
          // the compatible option; offering arbitrary embed models would let a
          // user pick a mismatched dimension that fails at ingestion time.
          if (transcriptions.length) setTranscriptionModels(transcriptions);
        }
      })
      .catch((err) => console.error("Failed to fetch OpenRouter models:", err));
  }, []);

  function applyKeyFlags(u: any) {
    setHasKey(!!u.has_api_key);
    setHasTavily(!!u.has_tavily_key);
    setHasMedia(!!u.has_media_integrity_key);
  }

  // Save only the key fields the user actually typed into (empty inputs are
  // ignored, so saving never wipes a key you didn't touch). Use Remove to clear.
  const hasKeyEdits = !!(value.trim() || tavilyVal.trim() || mediaVal.trim());

  async function save() {
    // Don't report a phantom "Saved" when there's nothing to send.
    if (!hasKeyEdits) { setError("Enter a key first — or use Remove to clear one."); return; }
    setLoading(true); setError(""); setSaved(false);
    try {
      const payload: Record<string, string> = {};
      if (value.trim()) payload.openrouter_api_key = value.trim();
      if (tavilyVal.trim()) payload.tavily_api_key = tavilyVal.trim();
      if (mediaVal.trim()) payload.media_integrity_api_key = mediaVal.trim();
      const u = await updateSettings(payload);
      applyKeyFlags(u);
      setValue(""); setTavilyVal(""); setMediaVal("");
      setSaved(true);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const KEY_LABELS: Record<string, string> = {
    openrouter_api_key: "OpenRouter key",
    tavily_api_key: "Tavily key",
    media_integrity_api_key: "Hive API token",
  };

  async function removeKey(field: "openrouter_api_key" | "tavily_api_key" | "media_integrity_api_key") {
    const label = KEY_LABELS[field];
    if (!window.confirm(`Remove your ${label}? Analyses will stop using it until you add it again.`)) return;
    setLoading(true); setError(""); setSaved(false);
    try {
      const u = await updateSettings({ [field]: "" } as any);
      applyKeyFlags(u);
      setSaved(true);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function changeWorkspace(role: string) {
    if (role === user?.role || switching) return;
    const label = WORKSPACES.find((w) => w.value === role)?.label ?? role;
    if (!window.confirm(`Switch your workspace to ${label}? Your data is kept — this changes which tools and dashboards you see.`)) return;
    setSwitching(role);
    setRoleError("");
    try {
      let orgName: string | undefined;
      if (role === "business" && !user?.organization_id) {
        orgName = window.prompt("Name your company / brand workspace:", user?.full_name ? `${user.full_name}'s workspace` : "")?.trim() || undefined;
      }
      const me = await switchRole(role, orgName);
      if (me.role !== role) {
        // The backend refused (role pinned in app_metadata).
        setRoleError("Your workspace is managed by an administrator and can't be changed here.");
        setUser((u: any) => ({ ...u, role_locked: true }));
        return;
      }
      // Land on the new workspace's home so the switch is unmistakable.
      router.push(routeForRole(role));
    } catch (e: any) {
      setRoleError(e.message || "Couldn't switch workspace.");
    } finally {
      setSwitching(null);
    }
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
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="font-heavy text-4xl text-ink">Settings</h1>

        {/* ── Usage dashboard ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10">
              <Sparkle className="h-3.5 w-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-widest">AI Usage & Costs</h2>
          </div>

          {usageErr ? (
            <div className="rounded-lg border border-bad/20 bg-bad/10 px-4 py-3 text-sm text-bad" role="alert">{usageErr}</div>
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
                            <span className="ml-auto font-semibold" style={{ color: m.cost_usd > 0 ? "rgb(var(--warn))" : "rgb(var(--good))" }}>
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
                      <span className="font-bold" style={{ color: usage.total_cost_usd > 0 ? "rgb(var(--warn))" : "rgb(var(--good))" }}>
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

        {/* ── Workspace / role ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface border border-line">
              <Layers className="h-3.5 w-3.5 text-ink-faint" />
            </div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-widest">Workspace</h2>
          </div>

          <div className="card space-y-4">
            <p className="text-sm text-ink-light leading-relaxed">
              TruthLayer adapts to your role. Switch anytime — your videos, products, and analyses are kept.
            </p>

            {user?.role_locked && (
              <div className="flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-light" role="status">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
                Your workspace is set by an administrator and can&apos;t be changed here.
              </div>
            )}

            <div className="space-y-2">
              {WORKSPACES.map((w) => {
                const active = user?.role === w.value;
                const disabled = active || !!switching || !!user?.role_locked;
                return (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => changeWorkspace(w.value)}
                    disabled={disabled}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-accent/30 bg-accent/5"
                        : "border-line hover:border-ink/20 hover:bg-hover disabled:hover:border-line disabled:hover:bg-transparent"
                    } ${!active && (switching || user?.role_locked) ? "opacity-60" : ""}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${active ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-surface text-ink-faint"}`}>
                      {w.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-ink">{w.label}</span>
                      <span className="block text-xs text-ink-light leading-snug">{w.desc}</span>
                    </span>
                    {active ? (
                      <span className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-accent">
                        Current
                      </span>
                    ) : switching === w.value ? (
                      <span className="shrink-0 text-xs font-semibold text-ink-light">Switching…</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {roleError && <div className="rounded-lg border border-bad/20 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">{roleError}</div>}
          </div>
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
                <strong>Required.</strong> All AI runs through your own OpenRouter key — it&apos;s
                stored encrypted and used only for your analyses. Until it&apos;s set, analysis is disabled.
              </p>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
                  hasKey ? "border-good/25 bg-good/10 text-good" : "border-bad/25 bg-bad/10 text-bad"
                }`}
              >
                {hasKey ? <><Check className="h-3 w-3" /> Connected</> : "Not set"}
              </span>
            </div>

            <div>
              <label className="label" htmlFor="openrouter-key">Your OpenRouter key</label>
              <input
                id="openrouter-key"
                className="input font-mono"
                type="password"
                autoComplete="off"
                placeholder="sk-or-v1-…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                Get a key at{" "}
                <a className="text-accent hover:underline" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
                  openrouter.ai/keys
                </a>.
              </p>
            </div>

            {/* ── Optional service keys ── */}
            <div className="space-y-4 border-t border-line pt-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-faint">
                Optional service keys
              </p>

              <KeyField
                id="tavily-key"
                label="Tavily key" badge={hasTavily} hint="Web-search evidence for fact-checking."
                placeholder="tvly-…" value={tavilyVal} onChange={setTavilyVal}
                onRemove={() => removeKey("tavily_api_key")} canRemove={hasTavily} loading={loading}
              />
              <KeyField
                id="media-integrity-key"
                label="Hive API token" badge={hasMedia} hint="Hive deepfake detection for business authenticity scoring. Requires MEDIA_INTEGRITY_PROVIDER=hive and a public BACKEND_PUBLIC_URL."
                placeholder="Hive token…" value={mediaVal} onChange={setMediaVal}
                onRemove={() => removeKey("media_integrity_api_key")} canRemove={hasMedia} loading={loading}
              />
            </div>

            {error && <div className="rounded-lg border border-bad/20 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">{error}</div>}
            {saved && (
              <div className="rounded-lg border border-good/20 bg-good/10 px-3 py-2 text-sm text-good flex items-center gap-1.5" role="status">
                <Check className="h-4 w-4" /> Saved successfully.
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button className="btn-accent" onClick={save} disabled={loading || !hasKeyEdits}>
                {loading ? "Saving…" : "Save keys"}
              </button>
              {hasKey && (
                <button className="btn-ghost" onClick={() => removeKey("openrouter_api_key")} disabled={loading}>
                  Remove OpenRouter key
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

            {/* Model Mapping Documentation */}
            <div className="rounded-xl border border-line bg-surface p-4 space-y-3.5">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-ink-faint">Model Architecture &amp; Task Mapping</div>
              
              <div className="grid gap-3 text-xs leading-relaxed text-ink-light">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent font-bold">1</div>
                  <div>
                    <strong className="text-ink">Chat LLM (Reasoning &amp; Fusion):</strong> Runs parallel agents (Fact-Check, Bias, Sentiment, Compliance, Creator Risk, Perception) and compiles final explainable reports and summaries.
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-good/10 text-good font-bold">2</div>
                  <div>
                    <strong className="text-ink">Audio Transcription (Speech-to-Text):</strong> Your selected audio model transcribes the spoken track. Only models that accept audio input are offered. On-screen text OCR, text-to-speech alignment, and Video Segment Analysis run automatically on a dedicated vision model — no configuration needed.
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-warn/10 text-warn font-bold">3</div>
                  <div>
                    <strong className="text-ink">Vector Embeddings (RAG Retrieval):</strong> Generates search vector points of brand documents and marketing rules to verify claims against your knowledge base.
                  </div>
                </div>
              </div>
            </div>

            {/* Chat LLM / Reasoning Select */}
            <div>
              <label className="label flex items-center gap-1.5 mb-1.5" htmlFor="model-llm">
                <Sparkle className="h-3.5 w-3.5 text-accent" />
                Chat LLM (Reasoning &amp; Agents)
              </label>
              <div className="relative">
                <select
                  id="model-llm"
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
              <label className="label flex items-center gap-1.5 mb-1.5" htmlFor="model-transcription">
                <AudioLines className="h-3.5 w-3.5 text-good" />
                Audio Transcription (Speech-to-Text)
              </label>
              <div className="relative">
                <select
                  id="model-transcription"
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
                        <span className="font-bold text-sm" style={{ color: tPricing.audio + tPricing.completion > 0 ? "rgb(var(--warn))" : "rgb(var(--good))" }}>
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

            {/* Vector Embeddings (business RAG). Fixed, not a choice: the pgvector
                column width is locked at EMBEDDINGS_DIM (1536) on first run, so
                only the 1536-dim model is valid. Shown read-only rather than as a
                dropdown that pretends to offer alternatives it can't accept. */}
            {user?.role === "business" && (
              <div>
                <label className="label flex items-center gap-1.5 mb-1.5">
                  <Network className="h-3.5 w-3.5 text-warn" />
                  Vector Embeddings (RAG Retrieval)
                </label>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
                  <span className="font-mono text-sm text-ink">{DEFAULT_EMBEDDING_MODELS[0].name}</span>
                  <span className="shrink-0 rounded-full border border-line bg-paper px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-ink-faint">
                    Fixed
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-ink-faint">
                  Used to search your brand knowledge base. Fixed to a 1536-dimension model to match your indexed documents — changing it would require re-indexing everything.
                </p>
              </div>
            )}

            {savedModels && (
              <div className="rounded-lg border border-good/20 bg-good/10 px-3 py-2 text-sm text-good flex items-center gap-1.5" role="status">
                <Check className="h-4 w-4" /> Saved successfully.
              </div>
            )}
            {modelsError && <div className="rounded-lg border border-bad/20 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">{modelsError}</div>}

            <div className="flex gap-2.5 pt-1">
              <button className="btn-accent" onClick={saveModelsConfig} disabled={savingModels}>
                {savingModels ? "Saving…" : "Save model stack"}
              </button>
            </div>
          </div>
        </section>

        {/* ── Danger zone: right to erasure ── */}
        <section className="card border-bad/30">
          <h2 className="text-sm font-bold uppercase tracking-wide text-bad">Delete account</h2>
          <p className="mt-1.5 text-xs text-ink-light">
            Permanently deletes your account and all associated data — your videos,
            transcripts, analyses, products, and stored API keys. This cannot be undone.
          </p>
          <button
            className="mt-3 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm font-semibold text-bad transition hover:bg-bad/20 disabled:opacity-60"
            disabled={deletingAccount}
            onClick={async () => {
              if (!window.confirm("Delete your account and ALL your data? This cannot be undone.")) return;
              setDeletingAccount(true);
              try {
                await deleteAccount();
                router.push("/");
              } catch (e: any) {
                setError(e.message);
                setDeletingAccount(false);
              }
            }}
          >
            {deletingAccount ? "Deleting…" : "Delete my account and all data"}
          </button>
        </section>

      </div>
    </AppShell>
  );
}
