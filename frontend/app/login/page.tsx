"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { login, routeForRole } from "@/lib/api";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Layers, ArrowRight, ShieldCheck, Check, Eye } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await login(email, password);
      router.push(routeForRole(data.role));
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen bg-paper">

      {/* ── Left: brand panel ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-ink px-12 py-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper/10 border border-paper/20">
            <Layers className="h-4 w-4 text-paper" />
          </span>
          <span className="text-sm font-bold text-paper">TruthLayer</span>
        </Link>

        <div>
          <h1 className="font-heavy text-5xl uppercase leading-[0.9] tracking-tight text-paper">
            Truth in<br />every video
          </h1>
          <p className="mt-4 max-w-xs text-sm text-paper/60 leading-relaxed">
            AI trust, compliance and media intelligence. Calibrated verdicts backed by evidence.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: <ShieldCheck className="h-4 w-4 text-good" />, label: "6 parallel AI lenses per analysis" },
              { icon: <Check className="h-4 w-4 text-good" />,       label: "Every claim linked to evidence" },
              { icon: <Eye className="h-4 w-4 text-good" />,         label: "Deepfake & manipulation detection" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10">{f.icon}</span>
                <span className="text-xs font-semibold text-paper/70">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-paper/30">© {new Date().getFullYear()} TruthLayer</p>
      </div>

      {/* ── Right: form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-paper">
            <Layers className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold text-ink">TruthLayer</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-heavy text-3xl uppercase tracking-tight text-ink">Welcome back</h2>
            <p className="mt-1.5 text-sm text-ink-light">Sign in to your workspace.</p>
          </div>

          <div className="card space-y-5">
            <GoogleAuthButton label="Sign in with Google" />

            <div className="flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-line" /> or continue with email <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label" htmlFor="login-email">Email</label>
                <input id="login-email" className="input" type="email" placeholder="you@example.com"
                  autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="login-password">Password</label>
                <input id="login-password" className="input" type="password" placeholder="••••••••"
                  autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-bad" role="alert">{error}</p>}
              <button className="btn-accent w-full py-2.5 text-sm" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-ink-light">
            No account?{" "}
            <Link href="/register" className="font-semibold text-accent hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
