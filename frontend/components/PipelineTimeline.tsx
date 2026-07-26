"use client";

import { useEffect, useRef, useState } from "react";
import { FileSearch, AudioLines, Eye, Scale, Network, ShieldCheck } from "@/components/icons";

interface Step {
  title: string;
  subtitle: string;
  description: string;
  tech: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    title: "Ingestion & Audio Extraction",
    subtitle: "Fetching the source assets",
    description: "Accepts any YouTube, TikTok, Instagram or file upload. The engine utilizes yt-dlp to grab metadata, analyze streams, and extract the highest-quality audio codec for processing.",
    tech: "yt-dlp",
    icon: <FileSearch className="h-5 w-5" />,
  },
  {
    title: "Timestamped Transcription",
    subtitle: "Vocal track digitization",
    description: "Transcribes the vocal tracks using OpenRouter's speech-to-text engines (e.g. Gemini 2.5 Flash Audio), generating a high-resolution JSON transcript structure complete with micro-timestamps.",
    tech: "OpenRouter Audio API",
    icon: <AudioLines className="h-5 w-5" />,
  },
  {
    title: "Segment Labeling & Scope Check",
    subtitle: "Establishing context boundaries",
    description: "The 'content' agent runs first, determining if the video is marketing a specific product and labeling each transcript block as 'safe', 'verify', or 'risky' to scope subsequent agent runs.",
    tech: "Content Agent",
    icon: <Eye className="h-5 w-5" />,
  },
  {
    title: "Parallel Agent FLEET",
    subtitle: "Simultaneous specialized analyses",
    description: "Runs multiple domain-expert agents in parallel using a ThreadPoolExecutor. Agents analyze bias, sentiment, compliance, creator risk, perception harm, and deepfake verification.",
    tech: "ThreadPoolExecutor + Contextvars",
    icon: <Network className="h-5 w-5" />,
  },
  {
    title: "RAG & External Verification",
    subtitle: "Cross-referencing and validation",
    description: "Business claims are verified against uploaded guidelines and product specification docs using pgvector semantic search. Unregistered public claims trigger live Tavily API web lookups.",
    tech: "pgvector + Tavily API",
    icon: <Scale className="h-5 w-5" />,
  },
  {
    title: "Evidence Fusion & Scoring",
    subtitle: "The final calibrated trust verdict",
    description: "Compiles findings, penalizes unsupported claims or media deepfakes, calculates overall trust, risk, compliance, and sentiment scores, and writes the explainable Analysis Report.",
    tech: "Fusion Engine",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

export function PipelineTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Start drawing the line when the top of the container is 75% down the screen
      const startTrigger = viewportHeight * 0.75;
      // Finish drawing when the bottom of the container is 25% down the screen
      const endTrigger = viewportHeight * 0.25;

      const totalHeight = rect.height;
      const scrolledIntoView = startTrigger - rect.top;
      const scrollableRange = totalHeight - (endTrigger - startTrigger);

      const computedProgress = Math.min(1, Math.max(0, scrolledIntoView / Math.max(1, scrollableRange)));
      setProgress(computedProgress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <section ref={containerRef} className="relative mx-auto max-w-4xl px-6 py-24">
      <div className="mb-20 text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">The Pipeline Engine</span>
        <h2 className="mt-3 font-heavy text-5xl leading-[1.02] sm:text-6xl text-ink">
          How we verify
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-light leading-relaxed">
          TruthLayer processes video through a rigorous multi-stage pipeline, orchestrating parallel agents and factual databases to produce an explainable trust score.
        </p>
      </div>

      <div className="relative">
        {/* Core vertical line (The scroll line) */}
        <div className="absolute left-[23px] top-6 bottom-6 w-[3px] bg-line rounded-full" />
        
        {/* The active growing path */}
        <div 
          className="absolute left-[23px] top-6 w-[3px] bg-accent rounded-full origin-top transition-all duration-150 ease-out shadow-[0_0_8px_rgba(35,131,226,0.5)]" 
          style={{ height: `calc(${progress * 100}% - 12px)` }}
        />

        {/* Timeline steps */}
        <div className="space-y-16">
          {steps.map((step, idx) => {
            const stepThreshold = idx / (steps.length - 1);
            const isActive = progress >= stepThreshold;

            return (
              <div 
                key={idx} 
                className={`flex gap-6 items-start transition-opacity duration-500 ${
                  isActive ? "opacity-100" : "opacity-40"
                }`}
              >
                {/* Step Node (Bullet) */}
                <div 
                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-paper transition-all duration-300 ${
                    isActive 
                      ? "border-accent text-accent shadow-[0_0_12px_rgba(35,131,226,0.3)] scale-110" 
                      : "border-line text-ink-faint"
                  }`}
                >
                  {step.icon}
                  {/* Number Indicator */}
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[8.5px] font-black text-paper">
                    0{idx + 1}
                  </span>
                </div>

                {/* Content description (Directly on canvas, no boxes!) */}
                <div className="flex-1 pt-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className={`text-lg font-extrabold tracking-tight ${isActive ? "text-ink" : "text-ink-light"}`}>
                      {step.title}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      {step.tech}
                    </span>
                  </div>
                  
                  <div className="text-xs font-semibold text-ink-faint mt-0.5">
                    {step.subtitle}
                  </div>
                  
                  <p className="mt-2 text-sm leading-relaxed text-ink-light max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
