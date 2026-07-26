"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requestPasswordReset, updatePassword } from "@/lib/api";
import { Layers, ArrowRight, Check } from "@/components/icons";

/**
 * One route, two modes:
 *  - "request": ask for an email, send the reset link.
 *  - "update":  the user followed the emailed link, Supabase established a
 *    short-lived recovery session (PASSWORD_RECOVERY), so let them set a new one.
 */
export default function ResetPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the emailed link is opened.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    // Also handle the case where the session is already present on load.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
        setMode("update");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    try {
      await requestPasswordReset(email);
      setNotice("If an account exists for that email, a reset link is on its way. Check your inbox.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-paper">
            <Layers className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold text-ink">TruthLayer</span>
        </Link>

        <div className="mb-6 text-center">
          <h1 className="font-heavy text-3xl text-ink">
            {mode === "update" ? "Set a new password" : "Reset password"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-light">
            {mode === "update"
              ? "Choose a new password for your account."
              : "We'll email you a link to set a new password."}
          </p>
        </div>

        <div className="card space-y-4">
          {done ? (
            <p className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-good" role="status">
              <Check className="h-4 w-4" /> Password updated — redirecting to sign in…
            </p>
          ) : mode === "update" ? (
            <form onSubmit={setNewPassword} className="space-y-4">
              <div>
                <label className="label" htmlFor="reset-password">New password</label>
                <input
                  id="reset-password"
                  className="input"
                  type="password"
                  placeholder="8+ characters"
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-bad" role="alert">{error}</p>}
              <button className="btn-accent w-full py-2.5 text-sm" disabled={loading}>
                {loading ? "Saving…" : "Update password"} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={sendLink} className="space-y-4">
              <div>
                <label className="label" htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-bad" role="alert">{error}</p>}
              {notice && <p className="text-sm text-good" role="status">{notice}</p>}
              <button className="btn-accent w-full py-2.5 text-sm" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-ink-light">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
