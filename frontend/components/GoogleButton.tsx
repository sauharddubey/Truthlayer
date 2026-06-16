"use client";

import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Renders the official "Sign in with Google" button via Google Identity Services
 * (loaded globally in layout.tsx) and hands the returned ID-token credential to
 * the parent via onCredential.
 */
export function GoogleButton({
  onCredential,
  text = "signin_with",
}: {
  onCredential: (credential: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [unconfigured, setUnconfigured] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setUnconfigured(true);
      return;
    }
    let tries = 0;
    const init = () => {
      if (!window.google?.accounts?.id) {
        if (tries++ < 40) setTimeout(init, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential: string }) => onCredential(resp.credential),
      });
      if (ref.current) {
        window.google.accounts.id.renderButton(ref.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text,
          width: 320,
        });
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (unconfigured) {
    return (
      <div className="rounded-pill border border-white/15 bg-white/5 px-4 py-3 text-center text-xs text-white/40">
        Set <code className="text-white/60">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable Google login
      </div>
    );
  }

  return <div ref={ref} className="flex justify-center" />;
}
