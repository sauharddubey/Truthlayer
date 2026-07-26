"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getRights, listProducts, submitUrl, uploadVideo, getRole } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Link2, Upload, Sparkle } from "@/components/icons";

export default function AnalyzePage() {
  const router = useRouter();
  const [rights, setRights] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [tab, setTab] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [productId, setProductId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rightsAttested, setRightsAttested] = useState(false);

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.push("/login");
      return;
    }

    getRights().then((r) => {
      setRights(r);
      if (!r.formats?.includes("url")) setTab("upload");
      if (r.has_products) listProducts().then(setProducts).catch(() => {});
    }).catch((e) => setError(e.message));

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sharedUrl = params.get("url") || params.get("text");
      if (sharedUrl) {
        setUrl(sharedUrl);
      }
    }
  }, []);

  const formats: string[] = rights?.formats || ["url"];
  const tabOrder = (["url", "upload"] as const).filter((t) => formats.includes(t));

  function onTabKeyDown(e: React.KeyboardEvent) {
    const idx = tabOrder.indexOf(tab);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % tabOrder.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + tabOrder.length) % tabOrder.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabOrder.length - 1;
    else return;
    e.preventDefault();
    const nextTab = tabOrder[next];
    setTab(nextTab);
    document.getElementById(`analyze-tab-${nextTab}`)?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const video = tab === "url"
        ? await submitUrl(url, productId || undefined, rightsAttested)
        : await uploadVideo(file!, productId || undefined, rightsAttested);
      router.push(`/analysis/${video.id}`);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <AppShell title="Analyze a video">
      <div className="max-w-xl">

        {rights && (
          <div className="mb-6 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-accent">
              <Sparkle className="h-3 w-3" /> {rights.label} plan
            </span>
          </div>
        )}

        <div className="card space-y-6">
          {/* Tab switcher */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink-faint mb-3">Input method</div>
            <div role="tablist" aria-label="Input method" onKeyDown={onTabKeyDown} className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
              {formats.includes("url") && (
                <button
                  type="button"
                  role="tab"
                  id="analyze-tab-url"
                  aria-selected={tab === "url"}
                  aria-controls="analyze-panel"
                  tabIndex={tab === "url" ? 0 : -1}
                  onClick={() => setTab("url")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    tab === "url"
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink-light hover:text-ink"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" /> URL
                </button>
              )}
              {formats.includes("upload") && (
                <button
                  type="button"
                  role="tab"
                  id="analyze-tab-upload"
                  aria-selected={tab === "upload"}
                  aria-controls="analyze-panel"
                  tabIndex={tab === "upload" ? 0 : -1}
                  onClick={() => setTab("upload")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    tab === "upload"
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink-light hover:text-ink"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
              )}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div
              role="tabpanel"
              id="analyze-panel"
              aria-labelledby={tab === "url" ? "analyze-tab-url" : "analyze-tab-upload"}
            >
              {tab === "url" ? (
                <div>
                  <label className="label" htmlFor="analyze-url">Video URL</label>
                  <input
                    id="analyze-url"
                    className="input"
                    placeholder="https://youtube.com/watch?v=… or TikTok / Instagram"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">Supports YouTube, TikTok, and Instagram links.</p>
                </div>
              ) : (
                <div>
                  <label className="label" htmlFor="analyze-file">Video or audio file</label>
                  <input
                    id="analyze-file"
                    className="input"
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">MP4, MOV, MP3 — up to 500MB.</p>
                </div>
              )}
            </div>

            {rights?.has_products && (
              <div>
                <label className="label" htmlFor="analyze-product">Product <span className="text-ink-faint font-normal">(optional — auto-detected if blank)</span></label>
                <select id="analyze-product" className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
                  <option value="">Auto-detect from video</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {error && <p className="rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad" role="alert">{error}</p>}

            <label htmlFor="rights-attested" className="flex items-start gap-2 pt-1 text-xs text-ink-light">
              <input
                id="rights-attested"
                type="checkbox"
                className="mt-0.5"
                checked={rightsAttested}
                onChange={(e) => setRightsAttested(e.target.checked)}
                required
              />
              <span>I have the rights and a lawful basis to submit this content for analysis.</span>
            </label>

            <div className="pt-2 border-t border-line">
              <button className="btn-accent w-full py-3 text-sm font-bold" disabled={loading || !rightsAttested}>
                {loading ? "Submitting…" : "Start analysis"} <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-2 text-center text-xs text-ink-faint">Runs asynchronously — you'll land on a live results page.</p>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
