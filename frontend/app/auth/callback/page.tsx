"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { completeOAuth, routeForRole } from "@/lib/api";
import { Layers } from "@/components/icons";

/**
 * Lands here after the Google OAuth redirect. supabase-js detects the session
 * from the URL automatically; once it's present we apply any chosen role/org
 * and route to the right dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      try {
        const { role } = await completeOAuth();
        router.replace(routeForRole(role));
      } catch (e: any) {
        setError(e?.message || "Sign-in failed");
      }
    };

    // If the session is already resolved, finish immediately; otherwise wait
    // for supabase-js to process the redirect.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish();
    });

    const timeout = setTimeout(() => {
      if (!done) setError("Timed out completing sign-in. Please try again.");
    }, 12000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper">
        <Layers className="h-5 w-5" />
      </span>
      {error ? (
        <div className="text-center">
          <p className="text-sm text-bad">{error}</p>
          <button
            className="mt-3 text-sm font-semibold text-accent hover:underline"
            onClick={() => router.replace("/login")}
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-light">Completing sign-in…</p>
      )}
    </div>
  );
}
