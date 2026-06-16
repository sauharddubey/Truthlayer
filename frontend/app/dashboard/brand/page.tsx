"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addBrandKeyword, brandDashboard, mediaUrl } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Box, Plus, Network } from "@/components/icons";

function GlassStat({ label, value, color = "#2383e2" }: { label: string; value: any; color?: string }) {
  return (
    <div className="glass-tile p-5">
      <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-heavy text-4xl" style={{ color }}>{value ?? "—"}</div>
    </div>
  );
}

export default function BrandDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [kw, setKw] = useState("");

  function load() { brandDashboard().then(setData).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function addKw(e: React.FormEvent) {
    e.preventDefault();
    try { await addBrandKeyword(kw); setKw(""); load(); } catch (e: any) { setError(e.message); }
  }

  const sentiment = data?.brand_perception != null ? Math.round((data.brand_perception + 1) * 50) : null;

  return (
    <AppShell title="Brand overview" wide>
      {error && <p className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</p>}

      {/* Stat row */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <GlassStat label="Brand perception" value={sentiment} color="#2383e2" />
        <GlassStat label="Products" value={data?.products?.length ?? "—"} color="#0f7b6c" />
        <GlassStat label="Narrative clusters" value={data?.narrative_clusters?.length ?? "—"} color="#cb912f" />
      </div>

      {/* Brand identity */}
      <div className="glass-tile mb-4 p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-40" />
        <div className="relative z-10">
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/40 mb-3">Brand identity</div>
          <p className="text-sm text-white/70 leading-relaxed">
            {data?.brand_identity || "Add products and analyze videos to build your brand profile."}
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-good mb-2">Strengths</div>
              <ul className="space-y-1.5">
                {(data?.strengths || []).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-good" /> {s}
                  </li>
                ))}
                {!data?.strengths?.length && <li className="text-sm text-white/30">—</li>}
              </ul>
            </div>
            <div>
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-bad mb-2">Weaknesses</div>
              <ul className="space-y-1.5">
                {(data?.weaknesses || []).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bad" /> {s}
                  </li>
                ))}
                {!data?.weaknesses?.length && <li className="text-sm text-white/30">—</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Products catalog */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Products</h2>
          <Link href="/products" className="btn-ghost px-4 py-1.5 text-xs">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.products || []).map((p: any) => (
            <Link key={p.id} href={`/products/${p.id}`}
              className="group overflow-hidden rounded-2xl border border-line bg-paper transition-all hover:shadow-pop hover:border-ink/20">
              <div className="relative aspect-[5/3] overflow-hidden bg-surface">
                {p.image_url ? (
                  <img src={mediaUrl(p.image_url)!} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-faint"><Box className="h-7 w-7" /></div>
                )}
                {p.trust_score != null && (
                  <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-extrabold text-paper backdrop-blur">
                    {p.trust_score}
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-ink">{p.name}</div>
                <div className="mt-0.5 text-xs text-ink-faint">{p.video_count} videos</div>
              </div>
            </Link>
          ))}
          {!data?.products?.length && (
            <Link href="/products" className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-6 text-sm text-ink-light hover:bg-hover transition">
              <Plus className="h-4 w-4" /> Add your first product
            </Link>
          )}
        </div>
      </div>

      {/* Hashtags + narratives */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-tile p-5">
          <div className="text-base font-bold text-white mb-1">Brand hashtags</div>
          <p className="text-sm text-white/50 mb-4">Monitor general brand perception across these tags.</p>
          <form onSubmit={addKw} className="flex gap-2">
            <input className="input border-white/10 bg-white/5 text-white placeholder-white/30" placeholder="#yourbrand" value={kw} onChange={(e) => setKw(e.target.value)} required />
            <button className="btn-accent shrink-0"><Plus className="h-4 w-4" /></button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(data?.brand_keywords || []).map((k: any) => (
              <span key={k.id} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/70">{k.keyword}</span>
            ))}
          </div>
        </div>

        <div className="glass-tile p-5">
          <div className="flex items-center gap-2 text-base font-bold text-white mb-3">
            <Network className="h-4 w-4 text-warn" /> Narratives
          </div>
          <div className="space-y-0.5">
            {(data?.narrative_clusters || []).slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition hover:bg-white/5">
                <span className="text-white/80">{c.topic}</span>
                <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[10px] font-extrabold text-bad">risk {Math.round(c.risk_score)}</span>
              </div>
            ))}
            {!data?.narrative_clusters?.length && <p className="py-2 text-sm text-white/30">No narratives yet — analyze more videos.</p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
