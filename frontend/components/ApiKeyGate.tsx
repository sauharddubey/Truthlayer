"use client";

import { ReactNode, useEffect, useId, useState } from "react";
import Link from "next/link";
import { getMe, updateSettings } from "@/lib/api";
import { Modal } from "@/components/Modal";
import { Layers, ArrowRight, Check } from "@/components/icons";

/**
 * Blocks the app until the signed-in user has saved their own OpenRouter API
 * key. New accounts land here first: no key, no analysis. The key can be
 * entered inline so the gate is self-resolving on any page (settings included).
 */
export function ApiKeyGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "needs-key" | "ok">("loading");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();

  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => {
        if (!active) return;
        setStatus(me?.has_api_key ? "ok" : "needs-key");
      })
      .catch(() => {
        // Not authenticated / network issue — don't block, let the page handle auth.
        if (active) setStatus("ok");
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setSaving(true);
    setError("");
    try {
      const me = await updateSettings({ openrouter_api_key: key.trim() });
      if (me?.has_api_key) {
        setStatus("ok");
      } else {
        setError("That key was not accepted. Please double-check and try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Could not save your key. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {children}
      {status === "needs-key" && (
        <Modal
          onClose={() => {}}
          closeOnEsc={false}
          closeOnBackdrop={false}
          ariaLabelledby={titleId}
          backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-5 backdrop-blur-sm"
          panelClassName="card w-full max-w-md space-y-5"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper">
              <Layers className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-ink">TruthLayer</span>
          </div>

          <div>
            <h2 id={titleId} className="font-heavy text-2xl uppercase tracking-tight text-ink">
              Connect OpenRouter
            </h2>
            <p className="mt-1.5 text-sm text-ink-light leading-relaxed">
              TruthLayer runs every analysis on your own OpenRouter account. Add your
              API key to activate your workspace — nothing works until it's set.
            </p>
          </div>

          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="label" htmlFor="gate-openrouter-key">OpenRouter API key</label>
              <input
                id="gate-openrouter-key"
                className="input"
                type="password"
                autoComplete="off"
                placeholder="sk-or-v1-…"
                autoFocus
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-bad" role="alert">{error}</p>}
            <button className="btn-accent w-full py-2.5 text-sm" disabled={saving || !key.trim()}>
              {saving ? "Activating…" : "Activate workspace"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <Check className="h-3.5 w-3.5 text-accent" />
            <span>
              No key yet?{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent hover:underline"
              >
                Create a free one at openrouter.ai
              </a>
            </span>
          </div>

          <p className="text-center text-xs text-ink-faint">
            You can change models and keys anytime in{" "}
            <Link href="/settings" className="font-semibold text-accent hover:underline">
              Settings
            </Link>
            .
          </p>
        </Modal>
      )}
    </>
  );
}
