"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProduct, productOverview, productVideos, productDocuments, uploadProductDocument,
  productKeywords, addProductKeyword, productContradictions, recomputeProductNarratives, submitUrl,
  uploadProductImage, mediaUrl,
} from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { VideoBoard } from "@/components/VideoBoard";
import { Box, Plus, Network, AlertTriangle, ArrowRight, FileSearch, Eye, Scale } from "@/components/icons";

const TABS = ["Overview", "Videos", "Knowledge base", "Hashtags", "Narratives", "Contradictions"];
const C = (t?: number | null, invert = false) => {
  if (t == null) return "#9b9a97";
  const v = invert ? 100 - t : t;
  return v >= 70 ? "#0f7b6c" : v >= 40 ? "#cb912f" : "#e03e3e";
};

function GlassStat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="glass-tile p-4">
      <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-heavy text-3xl" style={{ color: color || C(typeof value === "number" ? value : null) }}>{value ?? "—"}</div>
    </div>
  );
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [tab, setTab] = useState("Overview");
  const [product, setProduct] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [vids, setVids] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [contradictions, setContradictions] = useState<any>(null);
  const [narratives, setNarratives] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [kw, setKw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function loadAll() {
    getProduct(id).then(setProduct).catch(() => {});
    productOverview(id).then(setOverview).catch(() => {});
    productVideos(id).then((d) => setVids(d.videos || [])).catch(() => {});
    productDocuments(id).then(setDocs).catch(() => {});
    productKeywords(id).then(setKeywords).catch(() => {});
  }
  useEffect(loadAll, [id]);

  async function submitForProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try { const v = await submitUrl(url, id); setUrl(""); window.location.href = `/analysis/${v.id}`; }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { await uploadProductDocument(id, f, type); setMsg(`Indexed "${f.name}".`); productDocuments(id).then(setDocs); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function addKw(e: React.FormEvent) {
    e.preventDefault();
    try { await addProductKeyword(id, kw); setKw(""); productKeywords(id).then(setKeywords); } catch (e: any) { setMsg(e.message); }
  }
  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { const p = await uploadProductImage(id, f); setProduct(p); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
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
          <h1 className="font-heavy text-3xl uppercase tracking-tight text-white">{product?.name || "Product"}</h1>
          {product?.description && <p className="mt-1 max-w-xl text-sm text-white/50">{product.description}</p>}
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
            onClick={() => { setTab(t); if (t === "Contradictions" && !contradictions) productContradictions(id).then(setContradictions); }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === t ? "bg-ink text-paper shadow" : "text-ink-light hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <GlassStat label="Trust" value={overview?.trust_score} />
            <GlassStat label="Sentiment" value={overview?.sentiment_score != null ? Math.round((overview.sentiment_score + 1) * 50) : null} color="#2383e2" />
            <GlassStat label="Compliance" value={overview?.compliance_score} />
            <GlassStat label="Videos" value={overview?.video_count ?? 0} color="#cb912f" />
          </div>
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
            <p className="mt-1 text-sm text-white/50">Specs &amp; approved facts. Claims matching these auto-verify.</p>
            <label className="btn-white mt-4 cursor-pointer">Upload PDF / DOCX / TXT
              <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => onUpload(e, "product_details")} /></label>
          </div>
          <div className="glass-tile p-5">
            <div className="flex items-center gap-2 text-base font-bold text-white"><Scale className="h-4 w-4 text-warn" /> Marketing policies</div>
            <p className="mt-1 text-sm text-white/50">Disclosure rules, restricted claims, brand guidelines.</p>
            <label className="btn-white mt-4 cursor-pointer">Upload PDF / DOCX / TXT
              <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => onUpload(e, "marketing_policy")} /></label>
          </div>
          <div className="glass-tile p-5 sm:col-span-2">
            <div className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-white/40">Indexed documents</div>
            {docs.length ? docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b border-white/8 py-2.5 text-sm text-white/80 last:border-0">
                <span className="flex items-center gap-2"><FileSearch className="h-3.5 w-3.5 text-white/40" /> {d.filename}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/60">{d.document_type.replace(/_/g, " ")}</span>
              </div>
            )) : <p className="text-sm text-white/30">No documents yet — upload spec sheets and policies above.</p>}
          </div>
        </div>
      )}

      {tab === "Hashtags" && (
        <div className="glass-tile max-w-lg p-5">
          <div className="text-base font-bold text-white">Product hashtags</div>
          <p className="mt-1 text-sm text-white/50">Monitor mentions of this product across platforms.</p>
          <form onSubmit={addKw} className="mt-3 flex gap-2">
            <input className="input border-white/10 bg-white/5 text-white placeholder-white/30" placeholder="#product" value={kw} onChange={(e) => setKw(e.target.value)} required />
            <button className="btn-accent shrink-0"><Plus className="h-4 w-4" /></button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {keywords.map((k) => <span key={k.id} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/70">{k.keyword}</span>)}
            {!keywords.length && <p className="text-sm text-white/30">No hashtags monitored yet.</p>}
          </div>
        </div>
      )}

      {tab === "Narratives" && (
        <div>
          <button className="btn-ghost mb-4" onClick={() => recomputeProductNarratives(id).then(setNarratives)}>
            <Network className="h-4 w-4" /> Recompute narratives
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            {narratives.map((c) => (
              <div key={c.id} className="glass-tile p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{c.topic}</span>
                  <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[10px] font-extrabold text-bad">risk {Math.round(c.risk_score)}</span>
                </div>
                <p className="mt-1.5 text-sm text-white/50">{c.summary}</p>
              </div>
            ))}
            {!narratives.length && <p className="text-sm text-ink-faint">Click recompute to cluster this product's videos into narratives.</p>}
          </div>
        </div>
      )}

      {tab === "Contradictions" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {contradictions === null && <p className="text-sm text-ink-faint">Loading…</p>}
          {contradictions?.contradictions?.length ? contradictions.contradictions.map((c: any, i: number) => (
            <div key={i} className="glass-tile p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-bad"><AlertTriangle className="h-4 w-4" /> Contradiction</div>
              <p className="mt-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/80">"{c.claim_a}"</p>
              <p className="mt-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/80">"{c.claim_b}"</p>
              <p className="mt-2 text-xs text-white/40">{c.explanation}</p>
            </div>
          )) : contradictions && <p className="text-sm text-ink-faint">No contradictions found across this product's videos.</p>}
        </div>
      )}
    </AppShell>
  );
}
