"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createProduct, listProducts, mediaUrl } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Box, Plus, ArrowRight } from "@/components/icons";

const C = (t?: number | null) => (t == null ? "#9b9a97" : t >= 70 ? "#0f7b6c" : t >= 40 ? "#cb912f" : "#e03e3e");

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", aliases: "" });

  function load() { listProducts().then(setProducts).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createProduct({
        name: form.name, description: form.description,
        aliases: form.aliases.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setForm({ name: "", description: "", aliases: "" });
      setOpen(false); load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <AppShell title="Products" wide>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-light">Your catalog — each product carries its own videos, knowledge base, hashtags and narratives.</p>
        <button className="btn-accent" onClick={() => setOpen(!open)}><Plus className="h-4 w-4" /> New product</button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</p>}

      {open && (
        <form onSubmit={create} className="glass-tile mb-5 space-y-4 p-5 n-fade">
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/40">New product</div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Product name</label>
            <input className="input border-white/10 bg-white/5 text-white placeholder-white/30" placeholder="Hydration Serum XL"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Product details</label>
            <textarea className="input border-white/10 bg-white/5 text-white placeholder-white/30" rows={3}
              placeholder="What it is, key specs, approved claims, restrictions…"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Aliases <span className="font-normal text-white/30">(comma-separated)</span></label>
            <input className="input border-white/10 bg-white/5 text-white placeholder-white/30" placeholder="Other names used in creator videos"
              value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
          </div>
          <div className="flex gap-2 border-t border-white/10 pt-3">
            <button className="btn-accent" type="submit">Create product</button>
            <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {products.length > 0 ? (
        <div className="grid auto-rows-[210px] grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p, i) => {
            const featured = i === 0;
            return (
              <Link key={p.id} href={`/products/${p.id}`}
                className={`group relative overflow-hidden rounded-[20px] border border-white/5 shadow-2xl ${featured ? "col-span-2 row-span-2" : "col-span-2 lg:col-span-1"}`}>
                {/* image / fallback */}
                {p.image_url ? (
                  <img src={mediaUrl(p.image_url)!} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1f]"><Box className="h-10 w-10 text-white/15" /></div>
                )}
                {/* dark gradient for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                {/* trust badge */}
                {p.trust_score != null && (
                  <span className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur"
                    style={{ background: C(p.trust_score) + "cc" }}>
                    {p.trust_score}
                  </span>
                )}
                {/* meta */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className={`font-bold text-white ${featured ? "text-xl" : "text-sm"}`}>{p.name}</div>
                  {featured && p.description && <p className="mt-1 line-clamp-2 max-w-md text-xs text-white/60">{p.description}</p>}
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/50">
                    <span>{p.video_count ?? 0} videos</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>
                </div>
              </Link>
            );
          })}
          {/* add tile */}
          <button onClick={() => setOpen(true)}
            className="col-span-2 flex flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-line text-ink-light transition hover:bg-hover lg:col-span-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface"><Plus className="h-5 w-5" /></span>
            <span className="text-sm font-semibold">Add product</span>
          </button>
        </div>
      ) : (
        !open && (
          <button onClick={() => setOpen(true)}
            className="glass-board flex h-[44vh] w-full flex-col items-center justify-center gap-3 text-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[90px]" />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"><Box className="h-6 w-6" /></span>
            <span className="text-sm font-semibold text-white/80">No products yet</span>
            <span className="max-w-xs text-xs text-white/40">Create a product to organize its videos and upload spec sheets & policies.</span>
            <span className="btn-accent mt-2"><Plus className="h-4 w-4" /> Add your first product</span>
          </button>
        )
      )}
    </AppShell>
  );
}
