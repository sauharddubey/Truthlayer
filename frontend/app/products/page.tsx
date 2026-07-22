"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createProduct, deleteProduct, listProducts, mediaUrl } from "@/lib/api";
import { formatMetric } from "@/lib/formatMetric";
import { useRoleGuard } from "@/lib/useRoleGuard";
import { AppShell } from "@/components/AppShell";
import { Box, Plus, ArrowRight } from "@/components/icons";

const C = (t?: number | null) => (t == null ? "rgb(var(--ink-faint))" : t >= 70 ? "rgb(var(--good))" : t >= 40 ? "rgb(var(--warn))" : "rgb(var(--bad))");

export default function ProductsPage() {
  const guardOk = useRoleGuard(["business"]);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", aliases: "" });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "trust" | "videos">("recent");

  function load() {
    listProducts()
      .then((p) => { setProducts(p); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await createProduct({
        name: form.name, description: form.description,
        aliases: form.aliases.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setForm({ name: "", description: "", aliases: "" });
      setOpen(false); load();
    } catch (e: any) { setError(e.message); } finally { setCreating(false); }
  }

  async function removeProduct(e: React.MouseEvent, productId: string) {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm("Delete this product and all its videos, documents, and data? This cannot be undone.");
    if (!ok) return;
    setDeletingId(productId);
    setError("");
    try {
      await deleteProduct(productId);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const visible = products
    .filter((p) => !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      if (sort === "trust") return (b.trust_score ?? -1) - (a.trust_score ?? -1);
      if (sort === "videos") return (b.video_count ?? 0) - (a.video_count ?? 0);
      return 0; // "recent": keep server order (newest first)
    });

  if (!guardOk) {
    return (
      <AppShell title="Products" wide>
        <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Products" wide>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {products.length > 0 ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              className="input max-w-xs"
              type="search"
              placeholder="Search products…"
              aria-label="Search products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="input w-auto"
              aria-label="Sort products"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="recent">Newest</option>
              <option value="name">Name (A–Z)</option>
              <option value="trust">Trust score</option>
              <option value="videos">Most videos</option>
            </select>
          </div>
        ) : <span />}
        <button className="btn-accent" onClick={() => setOpen(!open)}><Plus className="h-4 w-4" /> New product</button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</p>}

      {open && (
        <form onSubmit={create} className="glass-tile mb-5 space-y-4 p-5 n-fade">
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-ink-faint">New product</div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-light">Product name</label>
            <input className="input border-line bg-ink/5 text-ink placeholder-ink-faint" placeholder="Hydration Serum XL"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-light">Product details</label>
            <textarea className="input border-line bg-ink/5 text-ink placeholder-ink-faint" rows={3}
              placeholder="What it is, key specs, approved claims, restrictions…"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-light">Aliases <span className="font-normal text-ink-faint">(comma-separated)</span></label>
            <input className="input border-line bg-ink/5 text-ink placeholder-ink-faint" placeholder="Other names used in creator videos"
              value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
          </div>
          <div className="flex gap-2 border-t border-line pt-3">
            <button className="btn-accent" type="submit" disabled={creating}>{creating ? "Creating…" : "Create product"}</button>
            <button className="btn-ghost" type="button" onClick={() => setOpen(false)} disabled={creating}>Cancel</button>
          </div>
        </form>
      )}

      {products.length > 0 && visible.length === 0 ? (
        <div className="glass-board flex h-[30vh] w-full flex-col items-center justify-center gap-2 text-center">
          <Box className="h-7 w-7 text-ink-faint" />
          <p className="text-sm font-semibold text-ink">No products match “{query}”</p>
          <button className="text-xs text-accent hover:underline" onClick={() => setQuery("")}>Clear search</button>
        </div>
      ) : products.length > 0 ? (
        <div className="grid auto-rows-[210px] grid-cols-2 gap-4 lg:grid-cols-4">
          {visible.map((p, i) => {
            const featured = i === 0;
            return (
              <Link key={p.id} href={`/products/${p.id}`}
                className={`group relative overflow-hidden rounded-[20px] border border-line shadow-2xl ${featured ? "col-span-2 row-span-2" : "col-span-2 lg:col-span-1"}`}>
                {/* image / fallback */}
                {p.image_url ? (
                  <img src={mediaUrl(p.image_url)!} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1f]"><Box className="h-10 w-10 text-ink-faint" /></div>
                )}
                {/* dark gradient for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <button
                  type="button"
                  className="absolute left-3 top-3 z-10 rounded-full border border-line bg-black/40 px-2.5 py-1 text-[11px] font-bold text-bad backdrop-blur transition hover:bg-black/60"
                  onClick={(e) => removeProduct(e, p.id)}
                  disabled={deletingId === p.id}
                >
                  {deletingId === p.id ? "Deleting…" : "Delete"}
                </button>
                {/* trust badge */}
                {p.trust_score != null && (
                  <span className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-ink backdrop-blur"
                    style={{ background: C(p.trust_score) + "cc" }}>
                    {formatMetric(p.trust_score)}
                  </span>
                )}
                {/* meta */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className={`font-bold text-ink ${featured ? "text-xl" : "text-sm"}`}>{p.name}</div>
                  {featured && p.description && <p className="mt-1 line-clamp-2 max-w-md text-xs text-ink-light">{p.description}</p>}
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-ink-light">
                    <span>{p.video_count ?? 0} videos</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        !open && (
          <div className="glass-board flex h-[44vh] w-full flex-col items-center justify-center gap-2 text-center">
            <Box className="h-8 w-8 text-ink-faint" />
            <p className="text-sm font-semibold text-ink">No products yet</p>
            <p className="max-w-xs text-xs text-ink-faint">Use <span className="font-semibold text-ink-light">New product</span> above to create your first one.</p>
          </div>
        )
      )}
    </AppShell>
  );
}
