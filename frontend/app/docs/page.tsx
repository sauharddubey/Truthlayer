"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Sparkle, Box, FileSearch, Eye, Scale, Sun, Moon, Check, Lock, ArrowRight, Layers, AudioLines } from "@/components/icons";

const ADMIN_PASSWORD = "truthlayer-ip";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"user" | "admin">("user");
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin_unlocked") === "true") {
      setUnlocked(true);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setUnlocked(true);
      setError("");
      sessionStorage.setItem("admin_unlocked", "true");
    } else {
      setError("Invalid admin password. Access denied.");
    }
  };

  return (
    <AppShell wide>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="font-heavy text-4xl text-ink">Documentation</h1>
          <p className="text-sm text-ink-light mt-1">Everything you need to know about the TruthLayer platform.</p>
        </div>
        <div className="flex gap-2 rounded-full border border-line bg-sidebar p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("user")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "user" ? "bg-ink text-paper shadow" : "text-ink-light hover:text-ink"
            }`}
          >
            User Guides
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "admin" ? "bg-ink text-paper shadow" : "text-ink-light hover:text-ink"
            }`}
          >
            {!unlocked && <Lock className="h-3 w-3" />}
            Developer Specs
          </button>
        </div>
      </div>

      {activeTab === "user" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Intro */}
            <section className="glass-tile p-6">
              <h2 className="font-display text-xl font-bold text-ink mb-3 flex items-center gap-2">
                <Sparkle className="h-5 w-5 text-accent" /> What is TruthLayer?
              </h2>
              <p className="text-sm text-ink-light leading-relaxed mb-4">
                TruthLayer is a media-intelligence and compliance validation system for video content. 
                Our pipeline ingests video links or uploads, transcribes audio with precise segment-by-segment timestamps, 
                structures claims, and runs a battery of specialized AI agents to generate an audit report.
              </p>
              <div className="grid gap-4 sm:grid-cols-3 mt-4">
                <div className="rounded-xl bg-ink/5 p-4 border border-line">
                  <div className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Business</div>
                  <p className="text-xs text-ink-light">Verify marketing assets, auto-check claims against guidelines, and monitor narratives.</p>
                </div>
                <div className="rounded-xl bg-ink/5 p-4 border border-line">
                  <div className="text-xs font-bold text-good uppercase tracking-wider mb-1">Creator</div>
                  <p className="text-xs text-ink-light">Pre-publication checks on tone, emotional bias, controversy, and potential community guidelines risk.</p>
                </div>
                <div className="rounded-xl bg-ink/5 p-4 border border-line">
                  <div className="text-xs font-bold text-warn uppercase tracking-wider mb-1">Verifier</div>
                  <p className="text-xs text-ink-light">Deep analysis, citation lookup, and factual trust verdicts on every statement.</p>
                </div>
              </div>
            </section>

            {/* Section 2: AI Agents */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-ink border-b border-line pb-2">Our Specialized AI Agents</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card">
                  <h3 className="font-bold text-ink text-sm mb-1">1. Content Agent</h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Classifies context (e.g. promotional vs informational) and labels every segment as **safe**, **verify** (needs verification), or **risky** (needs revision).
                  </p>
                </div>
                <div className="card">
                  <h3 className="font-bold text-ink text-sm mb-1">2. Fact-Check Agent</h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Extracts testable claims and performs live web searches via Tavily to weigh supporting evidence and assign core verdicts (supported, contradicted, misleading, unverified).
                  </p>
                </div>
                <div className="card">
                  <h3 className="font-bold text-ink text-sm mb-1">3. Verification Agent</h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Business-only agent. Automatically cross-references claims against your company spec sheets, manuals, and advertising guidelines retrieved via RAG.
                  </p>
                </div>
                <div className="card">
                  <h3 className="font-bold text-ink text-sm mb-1">4. Bias & Persuasion Agent</h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Evaluates political/product bias, emotional framing, hype-driven language, and computes an overall narrative leaning score.
                  </p>
                </div>
                <div className="card">
                  <h3 className="font-bold text-ink text-sm mb-1">5. Perception Agent</h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Identifies insensitive, inflammatory, politically charged, or defamatory comments that could alienate communities or cause audience backlash.
                  </p>
                </div>
                <div className="card">
                  <h3 className="font-bold text-ink text-sm mb-1">6. Sentiment Agent</h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Tracks emotional intensity, tone (e.g. aggressive, trust-building), and plots a timestamped sentiment timeline.
                  </p>
                </div>
                <div className="card">
                  <h3 className="font-bold text-ink text-sm mb-1">7. Creator Risk Agent</h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Pinpoints platform terms-of-service violations, controversial theories, toxic wording, and gives actionable rewrites.
                  </p>
                </div>
                <div className="card">
                  <h3 className="font-bold text-ink text-sm mb-1">8. Media Integrity Agent</h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Checks audio/video channels for deepfakes, synthetic voice synthesis, temporal splicing anomalies, and known celebrity face matches.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Metric Formulas */}
            <section className="glass-tile p-6">
              <h2 className="font-display text-xl font-bold text-ink mb-4">Multi-Tier Scoring Mechanisms</h2>
              
              <div className="space-y-6 text-sm text-ink">
                {/* Business Tier */}
                <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-ink text-base">Business Tier Trust Score</h3>
                    <span className="chip border-accent/25 bg-accent/5 text-accent font-bold">Multi-Dimensional Audit</span>
                  </div>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Evaluates marketing assets across 5 distinct dimensions rather than relying solely on uploaded knowledge base documents:
                  </p>
                  <ul className="text-xs text-ink-light space-y-1 pl-4 list-disc">
                    <li><strong>Product Knowledge Base Compliance (35% Weight)</strong>: Verification of claims against company specs, manuals, and marketing guidelines (<code className="text-accent font-mono">auto_verified</code>: 100%, <code className="text-accent font-mono">approved</code>: 100%, <code className="text-warn font-mono">needs_review</code>: 55%, <code className="text-bad font-mono">contradicted</code>: 0%).</li>
                    <li><strong>Factual Accuracy (25% Weight)</strong>: Verification of factual statements against external web evidence gathered via Tavily search (<code className="text-good font-mono">supported</code>: 100%, <code className="text-ink-light font-mono">unverified</code>: 50%, <code className="text-warn font-mono">misleading</code>: 15%, <code className="text-bad font-mono">contradicted</code>: 0%).</li>
                    <li><strong>Regulatory &amp; Marketing Compliance (25% Weight)</strong>: Evaluates FTC disclosure requirements, legal disclaimers, and prohibited claims via the <code className="font-mono">compliance</code> agent.</li>
                    <li><strong>Brand Safety &amp; Bias (15% Weight)</strong>: Penalizes bias index and perception harm index to safeguard corporate reputation.</li>
                    <li><strong>Media Authenticity Multiplier</strong>: Multiplies the composite base by deepfake and visual manipulation analysis (<code className="font-mono text-good">authenticity_score</code> from 0.0 to 1.0).</li>
                  </ul>
                  <div className="mt-2 rounded-lg bg-ink/5 p-2 font-mono text-[11px] text-ink">
                    Business Trust Score = (0.35 * S_kb + 0.25 * S_fact + 0.25 * S_comp + 0.15 * S_brand) * S_authenticity
                  </div>
                </div>
                
                {/* Creator Tier */}
                <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-ink text-base">Creator Tier Trust Score</h3>
                    <span className="chip border-good/25 bg-good/5 text-good font-bold">Pre-Publication Check</span>
                  </div>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Designed for content creators to pre-check videos before publishing:
                  </p>
                  <ul className="text-xs text-ink-light space-y-1 pl-4 list-disc">
                    <li><strong>Factual Statement Integrity (40% Weight)</strong>: Core fact-check accuracy across extracted claims.</li>
                    <li><strong>Brand Safety &amp; Perception (30% Weight)</strong>: Audience perception check, toxic phrasing avoidance, and emotional bias.</li>
                    <li><strong>Platform Risk Index (30% Weight)</strong>: Adherence to YouTube / TikTok community guidelines and terms-of-service safety.</li>
                  </ul>
                  <div className="mt-2 rounded-lg bg-ink/5 p-2 font-mono text-[11px] text-ink">
                    Creator Trust Score = (0.40 * S_fact + 0.30 * S_brand + 0.30 * S_risk) * S_authenticity
                  </div>
                </div>

                {/* Verifier Tier */}
                <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-ink text-base">Verifier Tier Trust Score</h3>
                    <span className="chip border-warn/25 bg-warn/5 text-warn font-bold">Fact-Checking Core</span>
                  </div>
                  <p className="text-xs text-ink-light leading-relaxed">
                    Deep factual verification weighted by evidence coverage and citation quality:
                  </p>
                  <ul className="text-xs text-ink-light space-y-1 pl-4 list-disc">
                    <li><strong>Verdict Base Score</strong>: Weighted average of claim verdicts (<code className="text-good font-mono">supported</code>: 1.0, <code className="text-ink-light font-mono">unverified</code>: 0.5, <code className="text-warn font-mono">misleading</code>: 0.15, <code className="text-bad font-mono">contradicted</code>: 0.0).</li>
                    <li><strong>Evidence Coverage Multiplier</strong>: (0.55 + 0.45 * Coverage %) based on Tavily web snippet retrieval.</li>
                    <li><strong>Citation Quality Multiplier</strong>: (0.7 + 0.3 * URL Ratio) rewarding claims backed by live external sources.</li>
                    <li><strong>Confidence Factor</strong>: Average model extraction confidence across claim statements.</li>
                  </ul>
                  <div className="mt-2 rounded-lg bg-ink/5 p-2 font-mono text-[11px] text-ink">
                    Verifier Trust Score = Verdict Base * Coverage * Quality * Rerank Quality * Confidence
                  </div>
                </div>

                {/* Insufficient Claims Rule */}
                <div className="rounded-xl border border-line bg-sidebar p-4 space-y-1.5">
                  <h4 className="font-bold text-ink text-xs uppercase tracking-wider">Scientific Honesty: 0 Claims Rule</h4>
                  <p className="text-xs text-ink-light leading-relaxed">
                    If a video contains 0 verifiable factual claims (e.g. ambient music, visual footage, or purely subjective commentary), the Trust Score returns <code className="font-mono text-ink">None</code> (rendered as <code className="font-mono text-ink font-bold">·</code> with an <code className="font-mono text-warn font-bold">insufficient claims</code> badge). Falsely returning 100% or 50% for unchecked content is avoided to maintain scientific rigor.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="glass-tile p-5">
              <h3 className="font-bold text-ink text-sm mb-2">Getting Started</h3>
              <p className="text-xs text-ink-light leading-relaxed mb-4">
                To check a video, register your account, click on Analyze, enter a YouTube or TikTok link, and wait for the agents to audit your asset.
              </p>
              <Link href="/register" className="btn-accent w-full text-xs">Start check-up <ArrowRight className="h-3 w-3" /></Link>
            </div>
            
            <div className="card">
              <h3 className="font-bold text-ink text-sm mb-2">Workspace Isolation</h3>
              <p className="text-xs text-ink-light leading-relaxed">
                TruthLayer isolates all vector chunks and workspace documents under strict organization scoping parameters. 
                Your files never leak to external tenants.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Admin locked technical tab */
        <div className="min-h-[400px]">
          {!unlocked ? (
            <div className="glass-tile mx-auto max-w-md mt-10 p-8 text-center relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bad/10 via-transparent to-transparent opacity-30" />
              <div className="relative z-10 space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-bad">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Project IP Locked</h2>
                  <p className="text-xs text-ink-light mt-1">Enter password to view technical system architecture specs.</p>
                </div>
                <form onSubmit={handleUnlock} className="space-y-3">
                  <input
                    type="password"
                    placeholder="Enter admin password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input text-center max-w-xs border-line bg-ink/5 text-ink placeholder-ink-faint"
                  />
                  {error && <p className="text-xs font-semibold text-bad">{error}</p>}
                  <button type="submit" className="btn w-full max-w-xs text-xs">Unlock Specs</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="n-fade space-y-8">
              {/* Technical Overview */}
              <section className="glass-tile p-6">
                <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                  <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                    <Layers className="h-5 w-5 text-warn" /> System Architecture &amp; Data Flow
                  </h2>
                  <button
                    onClick={() => { setUnlocked(false); sessionStorage.removeItem("admin_unlocked"); }}
                    className="btn-ghost px-3 py-1 text-xs"
                  >
                    Lock Specs
                  </button>
                </div>

                <div className="font-mono text-xs overflow-x-auto bg-black/40 border border-line p-4 rounded-xl leading-relaxed text-ink whitespace-pre">
{`   [User Link/Media Upload]
             │
             ▼
   [yt-dlp Ingestion Service] ──────► Extract audio track (save locally in media volume)
             │
             ▼
   [Audio Speech transcription] ────► OpenRouter Audio Multimodal (time-granulated segments)
             │
             ▼
   [Structuring Service] ──────────► LLM JSON mapping into thematic blocks & claims
             │
             ▼
   [Vector Embeddings (RAG)] ──────► Retrieve org guidelines (pgvector cosine similarity)
             │
             ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Parallel Orchestrated Execution (ThreadPoolExecutor with ContextVars)  │
   │                                                                        │
   │   ┌───────────────┐   ┌─────────────┐   ┌──────────────┐               │
   │   │  fact_check   │   │ compliance  │   │  sentiment   │  ... (other)  │
   │   └───────┬───────┘   └──────┬──────┘   └──────┬───────┘               │
   └───────────┼──────────────────┼─────────────────┼───────────────────────┘
               │                  │                 │
               ▼                  ▼                 ▼
   [Fusion & Fusion Scores] ──────► persits AnalysisReport & findings in PostgreSQL`}
                </div>
              </section>

              {/* Data models */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-ink border-b border-line pb-2">Core Database Schema Structure</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="card space-y-2">
                    <div className="font-mono text-xs font-bold text-accent">Video Table</div>
                    <ul className="text-xs text-ink-light space-y-1 font-mono">
                      <li>• id: string (UUID)</li>
                      <li>• source_url: string (nullable)</li>
                      <li>• processing_status: string (enum)</li>
                      <li>• duration_seconds: float</li>
                      <li>• product_id: string (FK)</li>
                    </ul>
                  </div>

                  <div className="card space-y-2">
                    <div className="font-mono text-xs font-bold text-good">Claim Table</div>
                    <ul className="text-xs text-ink-light space-y-1 font-mono">
                      <li>• id: string (UUID)</li>
                      <li>• claim_text: text</li>
                      <li>• claim_type: string (promotional, medical, etc.)</li>
                      <li>• verdict: string (supported, contradicted)</li>
                      <li>• verification_status: string</li>
                    </ul>
                  </div>
                  
                  <div className="card space-y-2">
                    <div className="font-mono text-xs font-bold text-warn">DocumentChunk Table</div>
                    <ul className="text-xs text-ink-light space-y-1 font-mono">
                      <li>• id: string (UUID)</li>
                      <li>• content: text</li>
                      <li>• embedding: Vector(settings.EMBEDDINGS_DIM)</li>
                      <li>• organization_id: string (Scoping tenant isolation)</li>
                    </ul>
                  </div>

                  <div className="card space-y-2">
                    <div className="font-mono text-xs font-bold text-bad">UsageRecord Table</div>
                    <ul className="text-xs text-ink-light space-y-1 font-mono">
                      <li>• id: string (UUID)</li>
                      <li>• total_tokens: integer</li>
                      <li>• cost_microdollars: integer</li>
                      <li>• user_id: string (FK)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Tech details */}
              <section className="glass-tile p-6 space-y-4">
                <h3 className="font-display text-lg font-bold text-ink">Concurrency, RAG &amp; Safety Systems</h3>
                <div className="grid gap-6 sm:grid-cols-2 text-sm text-ink leading-relaxed">
                  <div>
                    <h4 className="font-bold text-ink">Parallelization Key Propagation</h4>
                    <p className="text-xs text-ink-light mt-1">
                      To safeguard API concurrency, the orchestrator spawns worker tasks inside a `ThreadPoolExecutor` where each worker runs inside a `contextvars.copy_context()` environment. This allows the submitting user's individual OpenRouter API key (`_runtime_api_key`) to propagate safely to parallel thread calls.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">Dynamic Embedding Dimension Checks</h4>
                    <p className="text-xs text-ink-light mt-1">
                      Our database bootstrap checks pgvector typmod constraints on the chunks table. If the settings.EMBEDDINGS_DIM changes dynamically (e.g. from 384 local sentence-transformers to 1536 OpenAI embeddings), we trigger a safe table drop/re-creation to avoid index vector constraint crashes on database insertion.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
