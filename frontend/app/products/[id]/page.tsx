"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getProduct, updateProduct, productOverview, productVideos, productDocuments, uploadProductDocument, deleteProductDocument,
  productKeywords, addProductKeyword, deleteProductKeyword, productContradictions, recomputeProductContradictions,
  productNarratives, recomputeProductNarratives, submitUrl,
  uploadProductImage, deleteProduct, mediaUrl,
} from "@/lib/api";
import { useRefetchOnVisible } from "@/lib/useRefetchOnVisible";
import { formatMetric, formatStatDisplay } from "@/lib/formatMetric";
import { AppShell } from "@/components/AppShell";
import { VideoBoard } from "@/components/VideoBoard";
import { Box, Plus, Network, AlertTriangle, ArrowRight, FileSearch, Eye, Scale, Pencil } from "@/components/icons";

const TABS = ["Overview", "Videos", "Knowledge base", "Hashtags", "Narratives", "Contradictions"];
const C = (t?: number | null, invert = false) => {
  if (t == null) return "#9b9a97";
  const v = invert ? 100 - t : t;
  return v >= 70 ? "#0f7b6c" : v >= 40 ? "#cb912f" : "#e03e3e";
};

function GlassStat({ label, value, color, isCount = false }: { label: string; value: any; color?: string; isCount?: boolean }) {
  return (
    <div className="glass-tile p-4">
      <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-heavy text-3xl" style={{ color: color || C(typeof value === "number" ? value : null) }}>{formatStatDisplay(value, isCount)}</div>
    </div>
  );
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const [tab, setTab] = useState("Overview");
  const [product, setProduct] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [vids, setVids] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [videoMatches, setVideoMatches] = useState<any[]>([]);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const [contradictions, setContradictions] = useState<any>(null);
  const [narratives, setNarratives] = useState<any[]>([]);
  const [narrativesLoaded, setNarrativesLoaded] = useState(false);
  const [contradictionsLoaded, setContradictionsLoaded] = useState(false);
  const [generatingNarratives, setGeneratingNarratives] = useState(false);
  const [generatingContradictions, setGeneratingContradictions] = useState(false);
  const [url, setUrl] = useState("");
  const [kw, setKw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  function loadKeywords() {
    productKeywords(id).then((d) => {
      setKeywords(d.keywords || []);
      setVideoMatches(d.video_matches || []);
    }).catch(() => {});
  }

  const loadAll = useCallback(() => {
    getProduct(id).then(setProduct).catch(() => {});
    productOverview(id).then(setOverview).catch(() => {});
    productVideos(id).then((d) => setVids(d.videos || [])).catch(() => {});
    productDocuments(id).then(setDocs).catch(() => {});
    loadKeywords();
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useRefetchOnVisible(loadAll);

  useEffect(() => {
    if (tab !== "Narratives" || narrativesLoaded) return;
    productNarratives(id)
      .then((rows) => { setNarratives(rows || []); setNarrativesLoaded(true); })
      .catch((e: any) => { setMsg(e.message); setNarrativesLoaded(true); });
  }, [tab, id, narrativesLoaded]);

  useEffect(() => {
    if (tab !== "Contradictions" || contradictionsLoaded) return;
    productContradictions(id)
      .then((report) => { setContradictions(report); setContradictionsLoaded(true); })
      .catch((e: any) => { setMsg(e.message); setContradictionsLoaded(true); });
  }, [tab, id, contradictionsLoaded]);

  async function generateNarratives() {
    setGeneratingNarratives(true);
    setMsg("");
    try {
      const rows = await recomputeProductNarratives(id);
      setNarratives(rows || []);
      setNarrativesLoaded(true);
      setMsg(rows?.length ? `Narrative report ready — ${rows.length} cluster${rows.length === 1 ? "" : "s"} found.` : "Narrative report ready — no clusters (analyze more videos first).");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setGeneratingNarratives(false);
    }
  }

  async function generateContradictions() {
    setGeneratingContradictions(true);
    setMsg("");
    try {
      const report = await recomputeProductContradictions(id);
      setContradictions(report);
      setContradictionsLoaded(true);
      const count = report?.contradictions?.length ?? 0;
      setMsg(count ? `Contradiction report ready — ${count} pair${count === 1 ? "" : "s"} found.` : "Contradiction report ready — no contradictions found.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setGeneratingContradictions(false);
    }
  }

  async function submitForProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try { const v = await submitUrl(url, id); setUrl(""); window.location.href = `/analysis/${v.id}`; }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingType(type);
    setMsg("");
    try {
      const doc = await uploadProductDocument(id, f, type);
      if (doc.status === "failed") {
        setMsg(`Could not extract text from "${f.name}". Try a text-based PDF or DOCX.`);
      } else {
        setMsg(`Indexed "${f.name}" — used in compliance and claim verification.`);
      }
      productDocuments(id).then(setDocs);
      productOverview(id).then(setOverview).catch(() => {});
    } catch (e: any) { setMsg(e.message); }
    finally { setUploadingType(null); e.target.value = ""; }
  }
  async function removeDocument(docId: string, filename: string) {
    const ok = window.confirm(`Remove "${filename}" from the knowledge base?`);
    if (!ok) return;
    setDeletingDocId(docId);
    setMsg("");
    try {
      await deleteProductDocument(id, docId);
      productDocuments(id).then(setDocs);
      productOverview(id).then(setOverview).catch(() => {});
      setMsg(`Removed "${filename}". Re-analyze videos to refresh claim checks.`);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDeletingDocId(null);
    }
  }
  async function addKw(e: React.FormEvent) {
    e.preventDefault();
    try { await addProductKeyword(id, kw); setKw(""); loadKeywords(); } catch (e: any) { setMsg(e.message); }
  }
  async function removeKeyword(keywordId: string) {
    const ok = window.confirm("Remove this hashtag?");
    if (!ok) return;
    setDeletingKeywordId(keywordId);
    try {
      await deleteProductKeyword(id, keywordId);
      loadKeywords();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDeletingKeywordId(null);
    }
  }
  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { const p = await uploadProductImage(id, f); setProduct(p); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function removeProduct() {
    const ok = window.confirm("Delete this product and all its videos, documents, and data? This cannot be undone.");
    if (!ok) return;
    setDeleting(true);
    setMsg("");
    try {
      await deleteProduct(id);
      router.push("/products");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDeleting(false);
    }
  }

  function startEditing() {
    setEditName(product?.name || "");
    setEditDescription(product?.description || "");
    setEditing(true);
    setMsg("");
  }

  function cancelEditing() {
    setEditing(false);
    setEditName("");
    setEditDescription("");
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    const name = editName.trim();
    if (!name) {
      setMsg("Product name is required.");
      return;
    }
    setSavingDetails(true);
    setMsg("");
    try {
      const p = await updateProduct(id, { name, description: editDescription.trim() || undefined });
      setProduct(p);
      setEditing(false);
      setMsg("Product details saved.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSavingDetails(false);
    }
  }

  return (
    <AppShell wide>
      <div className="mb-3 text-sm text-ink-light"><Link href="/products" className="hover:underline">Products</Link> <span className="mx-1">/</span> <span className="text-ink">{product?.name}</span></div>

      {/* ── Glass hero header ── */}
      <div className="glass-tile mb-5 flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-40" />
        <label className="group relative z-10 h-28 w-28 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {product?.image_url ? (
            <img src={mediaUrl(product.image_url)!} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-white/30"><Box className="h-8 w-8" /></span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[11px] font-bold text-transparent transition group-hover:bg-black/50 group-hover:text-white">
            {busy ? "…" : "Change"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={onImage} />
        </label>
        <div className="relative z-10 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {editing ? (
                <form onSubmit={saveDetails} className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[9px] font-extrabold uppercase tracking-widest text-white/40">Product name</label>
                    <input
                      className="input w-full border-white/10 bg-white/5 text-white placeholder-white/30"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[9px] font-extrabold uppercase tracking-widest text-white/40">Description</label>
                    <textarea
                      className="input w-full border-white/10 bg-white/5 text-white placeholder-white/30"
                      rows={3}
                      placeholder="What it is, key specs, approved claims, restrictions…"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-accent shrink-0" type="submit" disabled={savingDetails || busy || deleting}>
                      {savingDetails ? "Saving…" : "Save"}
                    </button>
                    <button className="btn-ghost shrink-0" type="button" onClick={cancelEditing} disabled={savingDetails}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-start gap-2">
                    <h1 className="font-heavy text-3xl uppercase tracking-tight text-white">{product?.name || "Product"}</h1>
                    <button
                      type="button"
                      className="btn-ghost shrink-0 px-2 py-1 text-xs text-white/50"
                      onClick={startEditing}
                      disabled={!product || busy || deleting}
                      aria-label="Edit product details"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </div>
                  {product?.description ? (
                    <p className="mt-1 max-w-xl text-sm text-white/50">{product.description}</p>
                  ) : (
                    <p className="mt-1 max-w-xl text-sm italic text-white/30">Add description…</p>
                  )}
                </>
              )}
            </div>
            {!editing && (
              <button
                type="button"
                className="btn-ghost shrink-0 text-bad"
                onClick={removeProduct}
                disabled={busy || deleting}
              >
                {deleting ? "Deleting…" : "Delete product"}
              </button>
            )}
          </div>
          <form onSubmit={submitForProduct} className="mt-4 flex flex-wrap gap-2">
            <input className="input flex-1 border-white/10 bg-white/5 text-white placeholder-white/30"
              placeholder="Paste a video URL to analyze for this product…" value={url} onChange={(e) => setUrl(e.target.value)} required />
            <button className="btn-accent shrink-0" disabled={busy}>Analyze <ArrowRight className="h-3.5 w-3.5" /></button>
          </form>
          {msg && <p className="mt-2 text-sm text-accent">{msg}</p>}
        </div>
      </div>

      {/* ── Pill tabs ── */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-line bg-sidebar p-1">
        {TABS.map((t) => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === t ? "bg-ink text-paper shadow" : "text-ink-light hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <GlassStat label="Trust" value={overview?.trust_score} />
            <GlassStat label="Sentiment" value={overview?.sentiment_score != null ? (overview.sentiment_score + 1) * 50 : null} color="#2383e2" />
            <GlassStat label="Compliance" value={overview?.compliance_score} />
            <GlassStat label="Videos" value={overview?.video_count ?? 0} color="#cb912f" isCount />
          </div>
          {overview?.knowledge_base && (
            <div className="glass-tile p-5">
              <div className="text-base font-bold text-white">Knowledge base</div>
              <p className="mt-1 text-sm text-white/50">
                Product details and marketing policies are indexed and used during video analysis for claim verification and compliance checks.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-bold text-white/70">
                  {overview.knowledge_base.product_details ?? 0} product details doc{(overview.knowledge_base.product_details ?? 0) === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-bold text-white/70">
                  {overview.knowledge_base.marketing_policy ?? 0} marketing polic{(overview.knowledge_base.marketing_policy ?? 0) === 1 ? "y" : "ies"}
                </span>
              </div>
            </div>
          )}
          {overview?.claims_needing_review?.length > 0 && (
            <div className="glass-tile p-5">
              <div className="flex items-center gap-2 text-base font-bold text-white"><AlertTriangle className="h-4 w-4 text-warn" /> Claims needing your review</div>
              <ul className="mt-3 space-y-2">
                {overview.claims_needing_review.map((c: any) => (
                  <li key={c.id} className="rounded-xl border border-white/8 bg-white/5 p-3 text-sm">
                    <Link href={`/analysis/${c.video_id}`} className="font-semibold text-white hover:underline">{c.claim_text}</Link>
                    {c.note && <p className="mt-0.5 text-xs text-white/50">{c.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "Videos" && <VideoBoard videos={vids} emptyHref="#" />}

      {tab === "Knowledge base" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-tile p-5">
            <div className="flex items-center gap-2 text-base font-bold text-white"><FileSearch className="h-4 w-4 text-accent" /> Product details</div>
            <p className="mt-1 text-sm text-white/50">Specs and approved facts. Matching claims are auto-verified during analysis.</p>
            <label className={`btn-white mt-4 cursor-pointer ${uploadingType === "product_details" ? "opacity-60" : ""}`}>
              {uploadingType === "product_details" ? "Indexing…" : "Upload PDF / DOCX / TXT"}
              <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" disabled={!!uploadingType}
                onChange={(e) => onUpload(e, "product_details")} /></label>
          </div>
          <div className="glass-tile p-5">
            <div className="flex items-center gap-2 text-base font-bold text-white"><Scale className="h-4 w-4 text-warn" /> Marketing policies</div>
            <p className="mt-1 text-sm text-white/50">Disclosure rules, restricted claims, and brand guidelines. Used by the compliance agent.</p>
            <label className={`btn-white mt-4 cursor-pointer ${uploadingType === "marketing_policy" ? "opacity-60" : ""}`}>
              {uploadingType === "marketing_policy" ? "Indexing…" : "Upload PDF / DOCX / TXT"}
              <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" disabled={!!uploadingType}
                onChange={(e) => onUpload(e, "marketing_policy")} /></label>
          </div>
          <div className="glass-tile p-5 sm:col-span-2">
            <div className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-white/40">Indexed documents</div>
            {docs.length ? docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 border-b border-white/8 py-2.5 text-sm text-white/80 last:border-0">
                <span className="flex min-w-0 items-center gap-2">
                  <FileSearch className="h-3.5 w-3.5 shrink-0 text-white/40" />
                  <span className="truncate">{d.filename}</span>
                  {d.status === "failed" && (
                    <span className="shrink-0 rounded-full bg-bad/15 px-2 py-0.5 text-[10px] font-bold text-bad">failed</span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/60">{d.document_type.replace(/_/g, " ")}</span>
                  <button
                    type="button"
                    className="rounded-full px-1.5 text-[10px] font-bold text-bad hover:bg-bad/10 disabled:opacity-50"
                    onClick={() => removeDocument(d.id, d.filename)}
                    disabled={deletingDocId === d.id}
                    aria-label={`Remove ${d.filename}`}
                  >
                    {deletingDocId === d.id ? "…" : "×"}
                  </button>
                </div>
              </div>
            )) : <p className="text-sm text-white/30">No documents yet — upload spec sheets and policies above. They are embedded and searched during each video analysis.</p>}
          </div>
        </div>
      )}

      {tab === "Hashtags" && (
        <div className="glass-tile max-w-3xl p-5">
          <div className="text-base font-bold text-white">Product hashtags</div>
          <p className="mt-1 text-sm text-white/50">Required tags are checked against each video&apos;s platform description during analysis.</p>
          <form onSubmit={addKw} className="mt-3 flex gap-2">
            <input className="input border-white/10 bg-white/5 text-white placeholder-white/30" placeholder="#product" value={kw} onChange={(e) => setKw(e.target.value)} required />
            <button className="btn-accent shrink-0"><Plus className="h-4 w-4" /></button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <span key={k.id} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 pl-2.5 pr-1 py-0.5 text-xs font-medium text-white/70">
                {k.keyword}
                <button
                  type="button"
                  className="rounded-full px-1.5 text-[10px] font-bold text-bad hover:bg-bad/10 disabled:opacity-50"
                  onClick={() => removeKeyword(k.id)}
                  disabled={deletingKeywordId === k.id}
                  aria-label={`Remove ${k.keyword}`}
                >
                  {deletingKeywordId === k.id ? "…" : "×"}
                </button>
              </span>
            ))}
            {!keywords.length && <p className="text-sm text-white/30">No hashtags monitored yet.</p>}
          </div>
          {videoMatches.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-white/40">Video hashtag status</div>
              <div className="space-y-2">
                {videoMatches.map((v) => (
                  <div key={v.video_id} className="rounded-xl border border-white/8 bg-white/5 p-3 text-sm">
                    <Link href={`/analysis/${v.video_id}`} className="font-semibold text-white hover:underline">{v.title}</Link>
                    {!v.description_available ? (
                      <p className="mt-1 text-xs text-white/40">No description available</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(v.present_keywords || []).map((tag: string) => (
                          <span key={`p-${tag}`} className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-bold text-good">{tag}</span>
                        ))}
                        {(v.missing_keywords || []).map((tag: string) => (
                          <span key={`m-${tag}`} className="rounded-full bg-bad/15 px-2 py-0.5 text-[10px] font-bold text-bad">{tag} missing</span>
                        ))}
                        {!v.present_keywords?.length && !v.missing_keywords?.length && (
                          <span className="text-xs text-white/40">Not analyzed yet</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Narratives" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-light">Cluster this product&apos;s analyzed videos into shared narrative themes.</p>
            <button
              type="button"
              className="btn-accent shrink-0"
              onClick={generateNarratives}
              disabled={generatingNarratives || busy}
            >
              <Network className="h-4 w-4" />
              {generatingNarratives ? "Generating…" : narratives.length ? "Regenerate narrative report" : "Generate narrative report"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {narratives.map((c) => (
              <div key={c.id} className="glass-tile p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{c.topic}</span>
                  <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[10px] font-extrabold text-bad">risk {formatMetric(c.risk_score)}</span>
                </div>
                <p className="mt-1.5 text-sm text-white/50">{c.summary}</p>
                {c.video_count != null && (
                  <p className="mt-2 text-xs text-white/40">{c.video_count} video{c.video_count === 1 ? "" : "s"} in cluster</p>
                )}
              </div>
            ))}
            {!narratives.length && !generatingNarratives && (
              <p className="text-sm text-ink-faint sm:col-span-2">
                {narrativesLoaded ? "No narrative clusters yet — analyze at least one video, then generate the report." : "Loading saved report…"}
              </p>
            )}
            {generatingNarratives && (
              <p className="text-sm text-ink-faint sm:col-span-2">Clustering transcripts and summarizing narratives…</p>
            )}
          </div>
        </div>
      )}

      {tab === "Contradictions" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-light">Compare claims across all videos for this product and flag conflicts.</p>
            <button
              type="button"
              className="btn-accent shrink-0"
              onClick={generateContradictions}
              disabled={generatingContradictions || busy}
            >
              <AlertTriangle className="h-4 w-4" />
              {generatingContradictions ? "Generating…" : contradictions?.generated_at ? "Regenerate contradiction report" : "Generate contradiction report"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {!contradictionsLoaded && !generatingContradictions && (
              <p className="text-sm text-ink-faint sm:col-span-2">Loading saved report…</p>
            )}
            {generatingContradictions && (
              <p className="text-sm text-ink-faint sm:col-span-2">Scanning claims across videos…</p>
            )}
            {contradictionsLoaded && !generatingContradictions && !contradictions?.generated_at && (
              <p className="text-sm text-ink-faint sm:col-span-2">
                No report yet — analyze at least two videos with claims, then generate the report.
              </p>
            )}
            {contradictions?.contradictions?.length ? contradictions.contradictions.map((c: any, i: number) => (
              <div key={i} className="glass-tile p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-bad"><AlertTriangle className="h-4 w-4" /> Contradiction</div>
                <p className="mt-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/80">&ldquo;{c.claim_a}&rdquo;</p>
                <p className="mt-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/80">&ldquo;{c.claim_b}&rdquo;</p>
                <p className="mt-2 text-xs text-white/40">{c.explanation}</p>
              </div>
            )) : contradictions?.generated_at && !generatingContradictions && (
              <p className="text-sm text-ink-faint sm:col-span-2">No contradictions found across this product&apos;s videos.</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
