"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getRights, listProducts, submitUrl, uploadVideo, getRole, routeForRole, MAX_UPLOAD_MB } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Link2, Upload, Sparkle } from "@/components/icons";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Reject locally what the server would reject anyway — before a long upload. */
function fileProblem(file: File): string | null {
  const maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `That file is ${formatBytes(file.size)}. The limit is ${MAX_UPLOAD_MB} MB — try a shorter clip or compress it first.`;
  }
  if (file.size === 0) return "That file is empty.";
  // Some browsers report an empty type for valid media; only reject a confident mismatch.
  if (file.type && !file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
    return "That doesn't look like a video or audio file. Upload an MP4, MOV, or MP3.";
  }
  return null;
}

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
  /** 0-100 while a file streams up; null when not uploading. */
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Bulk URL mode: paste many links, analyze them all at once.
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  const bulkUrls = bulkText.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.push("/login");
      return;
    }

    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const preselectProduct = params?.get("product");

    getRights().then((r) => {
      setRights(r);
      if (!r.formats?.includes("url")) setTab("upload");
      if (r.has_products) {
        listProducts()
          .then((ps) => {
            setProducts(ps);
            // Pre-select the product when arriving from its page (?product=<id>).
            if (preselectProduct && ps.some((p: any) => p.id === preselectProduct)) {
              setProductId(preselectProduct);
            }
          })
          .catch(() => {});
      }
    }).catch((e) => setError(e.message));

    if (params) {
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

  function onPickFile(picked: File | null) {
    setFile(picked);
    setError(picked ? fileProblem(picked) ?? "" : "");
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  async function submitBulk() {
    setError(""); setBulkStatus("");
    if (!bulkUrls.length) { setError("Paste at least one video URL."); return; }
    setLoading(true);
    let ok = 0;
    const failures: string[] = [];
    // Sequential — kinder to the backend than firing dozens at once.
    for (let i = 0; i < bulkUrls.length; i++) {
      setBulkStatus(`Submitting ${i + 1} of ${bulkUrls.length}…`);
      try {
        await submitUrl(bulkUrls[i], productId || undefined, rightsAttested);
        ok += 1;
      } catch (err: any) {
        failures.push(`${bulkUrls[i]} — ${err.message}`);
      }
    }
    setLoading(false);
    setBulkStatus("");
    if (ok > 0 && !failures.length) {
      router.push(routeForRole(getRole() || "verifier"));
      return;
    }
    if (ok > 0) {
      setError(`Started ${ok} of ${bulkUrls.length}. These failed:\n${failures.join("\n")}`);
    } else {
      setError(`None could be started:\n${failures.join("\n")}`);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (tab === "url" && bulk) { await submitBulk(); return; }

    if (tab === "upload") {
      if (!file) { setError("Choose a file to analyze."); return; }
      const problem = fileProblem(file);
      if (problem) { setError(problem); return; }
    }

    setLoading(true);
    try {
      let video: any;
      if (tab === "url") {
        video = await submitUrl(url, productId || undefined, rightsAttested);
      } else {
        const controller = new AbortController();
        abortRef.current = controller;
        setProgress(0);
        video = await uploadVideo(file!, productId || undefined, rightsAttested, {
          onProgress: setProgress,
          signal: controller.signal,
        });
      }
      router.push(`/analysis/${video.id}`);
    } catch (err: any) {
      // A cancel is a deliberate user action, not an error to shout about.
      if (err?.name === "AbortError") setError("Upload cancelled.");
      else setError(err.message);
    } finally {
      setLoading(false);
      setProgress(null);
      abortRef.current = null;
    }
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
                  <div className="flex items-center justify-between">
                    <label className="label" htmlFor="analyze-url">{bulk ? "Video URLs" : "Video URL"}</label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-accent hover:underline"
                      onClick={() => { setBulk(!bulk); setError(""); }}
                    >
                      {bulk ? "Analyze one" : "Analyze several at once"}
                    </button>
                  </div>
                  {bulk ? (
                    <>
                      <textarea
                        id="analyze-url"
                        className="input min-h-[110px] font-mono text-sm"
                        placeholder={"One URL per line:\nhttps://youtube.com/watch?v=…\nhttps://tiktok.com/@…"}
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        required
                      />
                      <p className="mt-1.5 text-xs text-ink-faint">
                        {bulkUrls.length > 0
                          ? `${bulkUrls.length} link${bulkUrls.length === 1 ? "" : "s"} — analyzed one after another.`
                          : "Paste multiple links (one per line). Each becomes its own analysis."}
                      </p>
                    </>
                  ) : (
                    <>
                      <input
                        id="analyze-url"
                        className="input"
                        placeholder="https://youtube.com/watch?v=… or TikTok / Instagram"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                      />
                      <p className="mt-1.5 text-xs text-ink-faint">Supports YouTube, TikTok, and Instagram links.</p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label" htmlFor="analyze-file">Video or audio file</label>
                  <input
                    id="analyze-file"
                    className="input"
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                    disabled={loading}
                    required
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">
                    MP4, MOV, MP3 — up to {MAX_UPLOAD_MB} MB.
                    {file && !fileProblem(file) ? ` Selected: ${file.name} (${formatBytes(file.size)}).` : ""}
                  </p>
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

            {error && <p className="whitespace-pre-line rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
            {bulkStatus && <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-light" role="status">{bulkStatus}</p>}

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

            {progress !== null && (
              <div className="rounded-xl border border-line bg-surface p-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">
                    {progress < 100 ? "Uploading…" : "Upload complete — starting analysis…"}
                  </span>
                  <span className="tabular-nums text-ink-light">{progress}%</span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-line"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Upload progress"
                >
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {progress < 100 && (
                  <button type="button" className="btn-ghost mt-2 w-full text-xs" onClick={cancelUpload}>
                    Cancel upload
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-line">
              <button className="btn-accent w-full py-3 text-sm font-bold" disabled={loading || !rightsAttested}>
                {loading
                  ? (progress !== null ? "Uploading…" : "Submitting…")
                  : tab === "url" && bulk && bulkUrls.length > 1
                  ? `Analyze ${bulkUrls.length} videos`
                  : "Start analysis"} <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-2 text-center text-xs text-ink-faint">
                {tab === "url" && bulk
                  ? "Each link is analyzed asynchronously — you'll land on your dashboard."
                  : "Runs asynchronously — you'll land on a live results page."}
              </p>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
