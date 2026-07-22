"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { register, routeForRole, resendSignupConfirmation } from "@/lib/api";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Layers, ArrowRight, Box, Eye, Scale, Check } from "@/components/icons";

const ROLES = [
  {
    value: "business",
    label: "Business",
    desc: "Compliance, influencer vetting & brand narrative monitoring",
    icon: <Box className="h-5 w-5" />,
    color: "#2383e2",
    bg: "rgba(35,131,226,0.08)",
    border: "rgba(35,131,226,0.25)",
  },
  {
    value: "creator",
    label: "Creator",
    desc: "Self-check videos pre-publication to prevent cancellation",
    icon: <Eye className="h-5 w-5" />,
    color: "#0f7b6c",
    bg: "rgba(15,123,108,0.08)",
    border: "rgba(15,123,108,0.25)",
  },
  {
    value: "verifier",
    label: "Verifier",
    desc: "Fact-check any public video with live evidence citations",
    icon: <Scale className="h-5 w-5" />,
    color: "#cb912f",
    bg: "rgba(203,145,47,0.08)",
    border: "rgba(203,145,47,0.25)",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "verifier", organization_name: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [consented, setConsented] = useState(false);
  // Set once sign-up succeeds but email confirmation is still pending.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const isBusiness = form.role === "business";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    try {
      const payload: any = { ...form };
      if (!isBusiness) delete payload.organization_name;
      const data = await register(payload);
      if ("needsConfirmation" in data) {
        setAwaitingConfirmation(true);
        return;
      }
      router.push(routeForRole(data.role));
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  async function resendConfirmation() {
    setResending(true); setError(""); setNotice("");
    try {
      await resendSignupConfirmation(form.email);
      setNotice("Confirmation email re-sent. Check your inbox and spam folder.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  const googleMeta = {
    role: form.role,
    full_name: form.full_name || undefined,
    organization_name: isBusiness ? form.organization_name || undefined : undefined,
  };

  const activeRole = ROLES.find((r) => r.value === form.role)!;

  return (
    <div className="flex min-h-screen bg-paper">

      {/* ── Left: brand panel ── */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between bg-ink px-12 py-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper/10 border border-paper/20">
            <Layers className="h-4 w-4 text-paper" />
          </span>
          <span className="text-sm font-bold text-paper">TruthLayer</span>
        </Link>

        <div>
          <h1 className="font-heavy text-5xl uppercase leading-[0.9] tracking-tight text-paper">
            Pick your<br />workspace
          </h1>
          <p className="mt-4 max-w-xs text-sm text-paper/60 leading-relaxed">
            TruthLayer adapts entirely to your role. Choose once — switch later in settings.
          </p>
          <div className="mt-8 space-y-3">
            {ROLES.map((r) => (
              <div key={r.value} className="flex items-center gap-3 opacity-70">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10"
                  style={{ color: r.color }}>{r.icon}</span>
                <div>
                  <div className="text-xs font-bold text-paper">{r.label}</div>
                  <div className="text-[10px] text-paper/40">{r.desc.split(" ").slice(0, 4).join(" ")}…</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-paper/30">© {new Date().getFullYear()} TruthLayer</p>
      </div>

      {/* ── Right: form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-paper">
            <Layers className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold text-ink">TruthLayer</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-heavy text-3xl uppercase tracking-tight text-ink">Create account</h2>
            <p className="mt-1.5 text-sm text-ink-light">Choose how you'll use TruthLayer.</p>
          </div>

          {/* Role selector */}
          <div className="mb-5 space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink-faint mb-3">Select your workspace</div>
            {ROLES.map((r) => {
              const active = form.role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className="flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200"
                  style={{
                    borderColor: active ? r.border : "#e9e9e7",
                    background: active ? r.bg : "transparent",
                  }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all"
                    style={{
                      background: active ? r.color + "15" : "#f7f7f5",
                      borderColor: active ? r.border : "#e9e9e7",
                      color: active ? r.color : "#9b9a97",
                    }}>
                    {r.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink">{r.label}</span>
                    <span className="block text-xs text-ink-light leading-snug">{r.desc}</span>
                  </span>
                  {active && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                      style={{ background: r.color }}>
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {awaitingConfirmation ? (
            <div className="card space-y-4 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-good/10 text-good">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Confirm your email</h3>
                <p className="mt-1 text-sm text-ink-light">
                  We sent a confirmation link to <strong className="text-ink">{form.email}</strong>. Open it, then sign in.
                </p>
              </div>
              {notice && <p className="text-sm text-good" role="status">{notice}</p>}
              {error && <p className="text-sm text-bad" role="alert">{error}</p>}
              <div className="space-y-2 pt-1">
                <Link href="/login" className="btn-accent w-full justify-center py-2.5 text-sm">
                  Go to sign in <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button type="button" className="btn-ghost w-full justify-center py-2.5 text-sm" onClick={resendConfirmation} disabled={resending}>
                  {resending ? "Resending…" : "Resend confirmation email"}
                </button>
              </div>
              <button
                type="button"
                className="text-xs text-ink-light hover:text-ink hover:underline"
                onClick={() => { setAwaitingConfirmation(false); setNotice(""); setError(""); }}
              >
                Use a different email
              </button>
            </div>
          ) : (
          <div className="card space-y-4">
            {isBusiness && (
              <div>
                <label className="label" htmlFor="register-org">Company / brand name</label>
                <input id="register-org" className="input" placeholder="Acme Inc."
                  autoComplete="organization"
                  value={form.organization_name}
                  onChange={(e) => setForm({ ...form, organization_name: e.target.value })} />
              </div>
            )}

            <GoogleAuthButton label="Sign up with Google" meta={googleMeta} />

            <div className="flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-line" /> or continue with email <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="label" htmlFor="register-name">Full name</label>
                <input id="register-name" className="input" placeholder="Jane Smith"
                  autoComplete="name"
                  value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="register-email">Email</label>
                <input id="register-email" className="input" type="email" placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label" htmlFor="register-password">Password</label>
                <input id="register-password" className="input" type="password" placeholder="8+ characters" minLength={8}
                  autoComplete="new-password"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              {error && <p className="text-sm text-bad" role="alert">{error}</p>}
              {notice && <p className="text-sm text-good" role="status">{notice}</p>}
              <label htmlFor="consent" className="flex items-start gap-2 text-xs text-ink-light">
                <input
                  id="consent"
                  type="checkbox"
                  className="mt-0.5"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  required
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="text-accent hover:underline" target="_blank">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-accent hover:underline" target="_blank">Privacy Policy</Link>.
                </span>
              </label>
              <button className="btn-accent w-full py-2.5 text-sm" disabled={loading || !consented}>
                {loading ? "Creating…" : `Create ${activeRole.label} account`} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
          )}

          <p className="mt-5 text-center text-sm text-ink-light">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
