import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — TruthLayer",
  description: "How TruthLayer handles personal data.",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-16 text-ink">
      <Link href="/" className="text-sm text-ink-light hover:text-ink hover:underline">
        ← Back to TruthLayer
      </Link>

      <h1 className="mt-6 font-heavy text-3xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-light">Last updated: [DATE]</p>

      <div
        role="note"
        className="mt-6 rounded-md border border-warn/40 bg-warn/10 p-4 text-sm text-ink"
      >
        <strong>Placeholder — replace before launch.</strong> This page is a shell wired
        into the app (footer links, sign-up consent capture, and the machine-readable
        sub-processor list at <code>/legal/subprocessors</code>). The legal wording below
        must be written/reviewed by your counsel; it is not legal advice.
      </div>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-ink-light">
        <div>
          <h2 className="text-base font-semibold text-ink">1. Data we process</h2>
          <p className="mt-1">
            Account data (email, name), the videos and public URLs you submit, and the
            data derived from them (transcripts, on-screen text, extracted claims,
            analysis reports). Note that submitted videos may contain the voices and
            faces of third parties. <em>[Complete with your specifics.]</em>
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">2. How we use it</h2>
          <p className="mt-1">[Describe purposes and lawful basis.]</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">3. Sub-processors</h2>
          <p className="mt-1">
            We share content with the third-party processors listed in our{" "}
            <a href="/legal/subprocessors" className="text-accent hover:underline">
              sub-processor list
            </a>{" "}
            (LLM/transcription, web-evidence, database/auth, and media-integrity
            providers). <em>[Confirm and describe transfers / DPAs.]</em>
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">4. Retention</h2>
          <p className="mt-1">[State your retention window and deletion practices.]</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">5. Your rights</h2>
          <p className="mt-1">
            You can delete your account and all associated data at any time from
            Settings (right to erasure). <em>[Complete with your jurisdiction's rights.]</em>
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">6. Contact</h2>
          <p className="mt-1">[Contact address for privacy requests.]</p>
        </div>
      </section>

      <p className="mt-10 text-sm text-ink-light">
        See also our{" "}
        <Link href="/terms" className="text-accent hover:underline">Terms of Service</Link>.
      </p>
    </main>
  );
}
