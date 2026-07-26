"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase";

function GoogleG() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

/**
 * "Continue with Google" via Supabase OAuth (PKCE redirect). For sign-up, pass
 * `meta` (role/org) so it can be applied to the profile after the redirect.
 */
export function GoogleAuthButton({
  label = "Continue with Google",
  meta,
}: {
  label?: string;
  meta?: { role: string; full_name?: string; organization_name?: string };
}) {
  const [err, setErr] = useState("");

  if (!supabaseConfigured) {
    return (
      <div className="rounded-pill border border-line bg-paper px-4 py-3 text-center text-xs text-ink-faint">
        Set <code className="text-ink-light">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="text-ink-light">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable login
      </div>
    );
  }

  async function go() {
    setErr("");
    try {
      await signInWithGoogle(meta);
    } catch (e: any) {
      setErr(e?.message || "Google sign-in failed");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d1d1f] transition-colors hover:bg-[#f4f5f8]"
      >
        <GoogleG /> {label}
      </button>
      {err && <p className="mt-2 text-center text-xs text-bad">{err}</p>}
    </div>
  );
}
