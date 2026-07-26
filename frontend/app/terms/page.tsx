import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — TruthLayer",
  description: "The terms governing use of TruthLayer.",
};

export default function TermsPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-16 text-ink">
      <Link href="/" className="text-sm text-ink-light hover:text-ink hover:underline">
        ← Back to TruthLayer
      </Link>

      <h1 className="mt-6 font-heavy text-3xl uppercase tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-light">Last updated: [DATE]</p>

      <div
        role="note"
        className="mt-6 rounded-md border border-warn/40 bg-warn/10 p-4 text-sm text-ink"
      >
        <strong>Placeholder — replace before launch.</strong> This is a wired-in shell
        (linked from the footer and accepted at sign-up). Replace the sections below with
        your counsel-reviewed terms; this is not legal advice.
      </div>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-ink-light">
        <div>
          <h2 className="text-base font-semibold text-ink">1. Acceptable use</h2>
          <p className="mt-1">[Describe permitted use of the service.]</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">2. Content you submit</h2>
          <p className="mt-1">
            You must have the rights and a lawful basis to submit any video or document
            you provide for analysis, including third-party content. You confirm this at
            upload time. <em>[Complete with your terms.]</em>
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">3. AI-generated output</h2>
          <p className="mt-1">
            Analysis results are automated, may be imperfect, and are provided for
            informational purposes. <em>[Add disclaimers as appropriate.]</em>
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">4. Accounts &amp; termination</h2>
          <p className="mt-1">[Describe account terms and your/their termination rights.]</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">5. Liability</h2>
          <p className="mt-1">[Limitations of liability.]</p>
        </div>
      </section>

      <p className="mt-10 text-sm text-ink-light">
        See also our{" "}
        <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
      </p>
    </main>
  );
}
