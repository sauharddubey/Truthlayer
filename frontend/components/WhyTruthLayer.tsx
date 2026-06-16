"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Eye, Scale, Layers, Check, AlertTriangle, Play, Sparkle, Link2, FileSearch, Network } from "@/components/icons";

type TabId = "brands" | "creators" | "viewers";

interface TabContent {
  id: TabId;
  tabLabel: string;
  icon: React.ReactNode;
  tag: string;
  title: string;
  problem: string;
  need: string;
}

const tabData: TabContent[] = [
  {
    id: "brands",
    tabLabel: "For Brands",
    icon: <Box className="h-4 w-4" />,
    tag: "SCALE VETTING FOR BUSINESS & BRANDS",
    title: "Secure Brand Compliance",
    problem: "Manual script auditing of hundreds of influencer uploads creates a massive bottleneck. Brands risk regulator fines and reputation crises when creator videos include illegal claims or omit sponsorship disclosures (#ad).",
    need: "An automated compliance registry reviewing all creator files in parallel, cross-referencing claims against active product registries, and protecting brand safety in real-time.",
  },
  {
    id: "creators",
    tabLabel: "For Creators",
    icon: <Eye className="h-4 w-4" />,
    tag: "REPUTATION GUARD FOR CREATORS",
    title: "Audit Drafts Pre-Publishing",
    problem: "A single verbal slip, factual error, or tonal misstep in a draft video can spark immediate online backlash, alienate sponsor networks, and threaten your entire channel.",
    need: "A reputation shield to review video draft files before upload, detecting hyperbole spikes, emotional bias framing, and expecting how delivery will land with audiences.",
  },
  {
    id: "viewers",
    tabLabel: "For Content Viewers",
    icon: <Scale className="h-4 w-4" />,
    tag: "PUBLIC FAITH & VERIFICATION",
    title: "Transparent Fact Checking",
    problem: "Generative AI, face swaps, and voice clones make visual evidence obsolete. Fake videos spread unchecked across networks, destroying public trust and media credibility.",
    need: "A verifier hub for the public square that extracts spoken claims, checks file authenticity, and links every claim verdict to factual references.",
  }
];

export function WhyTruthLayer() {
  const [activeTab, setActiveTab] = useState<TabId>("brands");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Pinning scroll behaviour is only active on larger viewports (min-width: 1024px)
      if (window.innerWidth < 1024) return;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = rect.height;
      const viewHeight = window.innerHeight;

      // Top of container scrolled past the top of the viewport
      const scrolled = -rect.top;
      const totalScrollable = containerHeight - viewHeight;

      if (totalScrollable <= 0) return;

      const progress = Math.min(Math.max(scrolled / totalScrollable, 0), 1);

      // Transition through three tabs based on scroll progress
      if (progress < 0.33) {
        setActiveTab("brands");
      } else if (progress < 0.66) {
        setActiveTab("creators");
      } else {
        setActiveTab("viewers");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    // Outer scroll wrapper (tall space on lg, natural on mobile)
    <div ref={containerRef} className="relative h-auto lg:h-[280vh] bg-paper border-t border-line/60">
      
      {/* Sticky container — pinned to viewport on scroll */}
      <div className="h-auto lg:sticky lg:top-0 lg:h-screen w-full flex flex-col pt-12 pb-6 px-6 relative">
        
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#cb912f]/5 blur-[100px] pointer-events-none" />

        {/* Inline styles for custom animations */}
        <style jsx global>{`
          @keyframes radar-sweep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes scanline-move {
            0% { top: 4%; }
            50% { top: 96%; }
            100% { top: 4%; }
          }
          @keyframes cursor-blink {
            50% { opacity: 0; }
          }
          @keyframes siri-pulse {
            0%, 100% { transform: scale(1) translate(0px, 0px); filter: brightness(1); }
            33% { transform: scale(1.1) translate(5px, -5px); filter: brightness(1.2); }
            66% { transform: scale(0.9) translate(-5px, 5px); filter: brightness(0.9); }
          }
          @keyframes card-pop {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(16px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          .animate-radar {
            animation: radar-sweep 4s linear infinite;
          }
          .animate-scanline {
            animation: scanline-move 3s ease-in-out infinite;
          }
          .animate-cursor {
            animation: cursor-blink 1s step-end infinite;
          }
          .animate-siri {
            animation: siri-pulse 8s ease-in-out infinite;
          }
          .card-anim {
            animation: card-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        `}</style>

        <div className="mx-auto max-w-5xl relative z-10 w-full">
          
          {/* Section Header */}
          <div className="mb-4 text-center shrink-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Platform Utility</span>
            <h2 className="mt-2 font-heavy text-4xl uppercase tracking-tight sm:text-5xl text-ink leading-none">
              Why TruthLayer?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-ink-light leading-relaxed">
              TruthLayer addresses the integrity crisis across three key profiles.
            </p>
          </div>

          {/* Pill Tab Selector */}
          <div className="flex justify-center mb-4 shrink-0">
            <div className="flex bg-sidebar border border-line p-1 rounded-full gap-1 shadow-sm">
              {tabData.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      // On click on desktop, scroll window to target percentage to match behavior
                      if (window.innerWidth >= 1024 && containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const scrolled = window.scrollY;
                        const containerTop = rect.top + scrolled;
                        const containerHeight = rect.height;
                        const viewHeight = window.innerHeight;
                        const totalScrollable = containerHeight - viewHeight;

                        let targetProgress = 0;
                        if (tab.id === "creators") targetProgress = 0.45;
                        if (tab.id === "viewers") targetProgress = 0.85;

                        window.scrollTo({
                          top: containerTop + totalScrollable * targetProgress,
                          behavior: "smooth"
                        });
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                      active
                        ? "bg-ink text-paper shadow-lg scale-[1.02]"
                        : "text-ink-light hover:text-ink hover:bg-line/30"
                    }`}
                  >
                    {tab.icon}
                    {tab.tabLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Apple Style Bento Grid Layout — no scroll, fits viewport */}
          <div key={activeTab}>
            {activeTab === "brands" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-[155px]">
                
                {/* Card 1: Compliance Registry Status (App Library Style) */}
                <div 
                  style={{ animationDelay: "0ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:col-span-2 row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent pointer-events-none opacity-40" />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">Compliance Registry</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-[9px] font-extrabold text-good uppercase bg-good/15 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse" /> Live Audit Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-2.5 relative z-10">
                    <div className="bg-[#18181c] border border-white/5 rounded-xl p-2 flex items-center justify-between text-xs hover:border-white/10 transition-all">
                      <span className="text-white/60 font-medium truncate">FTC Disclosure</span>
                      <span className="text-[10px] text-good font-extrabold bg-good/10 px-2 py-0.5 rounded">PASSED</span>
                    </div>
                    <div className="bg-[#18181c] border border-white/5 rounded-xl p-2 flex items-center justify-between text-xs hover:border-white/10 transition-all">
                      <span className="text-white/60 font-medium truncate">FDA Restrictions</span>
                      <span className="text-[10px] text-good font-extrabold bg-good/10 px-2 py-0.5 rounded">0 FLAGS</span>
                    </div>
                    <div className="bg-[#18181c] border border-white/5 rounded-xl p-2 flex items-center justify-between text-xs hover:border-white/10 transition-all">
                      <span className="text-white/60 font-medium truncate">Medical Claims</span>
                      <span className="text-[10px] text-warn font-extrabold bg-warn/10 px-2 py-0.5 rounded">1 ALERT</span>
                    </div>
                    <div className="bg-[#18181c] border border-white/5 rounded-xl p-2 flex items-center justify-between text-xs hover:border-white/10 transition-all">
                      <span className="text-white/60 font-medium truncate">Competitor mentions</span>
                      <span className="text-[10px] text-white/40 font-extrabold bg-white/5 px-2 py-0.5 rounded">CLEARED</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium relative z-10">
                    Reviews influencer uploads in parallel, flags legal risks and omissions.
                  </span>
                </div>

                {/* Card 2: Spoken Claims (Apple Messages Style) */}
                <div 
                  style={{ animationDelay: "60ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">FTC Speech Audit</span>
                  </div>
                  
                  <div className="space-y-2.5 my-2 text-xs">
                    <div className="flex justify-end">
                      <div className="bg-accent text-white px-3.5 py-1.5 rounded-2xl rounded-tr-sm max-w-[85%] font-medium leading-tight shadow-md">
                        "Our organic serum cures acne in three days."
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-[#2a2a2e]/90 text-white/95 px-3.5 py-1.5 rounded-2xl rounded-tl-sm max-w-[90%] font-medium leading-tight border border-white/5 shadow-sm">
                        <span className="text-warn font-extrabold flex items-center gap-1 mb-0.5 text-[9px] uppercase"><AlertTriangle className="h-3 w-3" /> FDA violation</span>
                        Restricted claims rule triggered: 'cures acne'.
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Speech-to-text analyzer flags structural liability.
                  </span>
                </div>

                {/* Card 3: Safety Concentric Rings (Apple Activity Rings Style) */}
                <div 
                  style={{ animationDelay: "120ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Safety Indicators</span>
                  </div>

                  <div className="flex items-center gap-4 my-2">
                    <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
                      {/* Ring 1: FTC Safety (Green) */}
                      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#162e24" strokeWidth="3" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#0f7b6c" strokeWidth="3" strokeDasharray="100" strokeDashoffset="15" strokeLinecap="round" />
                      </svg>
                      {/* Ring 2: RAG Alignment (Blue) */}
                      <svg className="absolute inset-0 h-full w-full -rotate-90 p-2" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#0c253d" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#2383e2" strokeWidth="3.5" strokeDasharray="100" strokeDashoffset="8" strokeLinecap="round" />
                      </svg>
                      {/* Ring 3: Perception (Orange) */}
                      <svg className="absolute inset-0 h-full w-full -rotate-90 p-4" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#37260e" strokeWidth="4" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#cb912f" strokeWidth="4" strokeDasharray="100" strokeDashoffset="30" strokeLinecap="round" />
                      </svg>
                      <div className="text-[10px] font-extrabold text-white text-center z-10 leading-none">94%<br /><span className="text-[7px] text-white/40">SAFE</span></div>
                    </div>

                    <div className="space-y-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold"><span className="h-2 w-2 rounded-full bg-good" /> FTC Compliant (85%)</div>
                      <div className="flex items-center gap-1.5 font-bold"><span className="h-2 w-2 rounded-full bg-accent" /> RAG Alignment (92%)</div>
                      <div className="flex items-center gap-1.5 font-bold"><span className="h-2 w-2 rounded-full bg-warn" /> Low Hype Risk (70%)</div>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Concentric scores visualizes real-time audit logs.
                  </span>
                </div>

                {/* Card 4: Narrative Intelligence (Cycling Map / Route Style) */}
                <div 
                  style={{ animationDelay: "180ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:col-span-2 row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-warn/10 via-transparent to-transparent pointer-events-none opacity-30" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-warn" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">Narrative Intelligence</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-warn bg-warn/10 px-2 py-0.5 rounded">3 Active Topic Clusters</span>
                  </div>

                  <div className="my-2 h-14 relative flex items-center justify-center">
                    <svg className="w-full h-full text-white/20" viewBox="0 0 380 60">
                      <path d="M 20 30 Q 80 5, 140 35 T 260 25 T 360 40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                      <path d="M 20 30 Q 80 5, 140 35 T 260 25 T 360 40" fill="none" stroke="url(#line-grad)" strokeWidth="2" strokeDasharray="6 4" />
                      
                      <defs>
                        <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#2383e2" />
                          <stop offset="50%" stopColor="#cb912f" />
                          <stop offset="100%" stopColor="#e03e3e" />
                        </linearGradient>
                      </defs>

                      <g transform="translate(20,30)">
                        <circle r="6" fill="#2383e2" className="animate-pulse" />
                        <circle r="3" fill="#ffffff" />
                        <text y="-10" textAnchor="middle" fill="rgba(255,255,255,0.6)" className="text-[7px] font-extrabold">Health</text>
                      </g>
                      <g transform="translate(140,35)">
                        <circle r="5" fill="#cb912f" />
                        <circle r="2" fill="#ffffff" />
                        <text y="-10" textAnchor="middle" fill="rgba(255,255,255,0.6)" className="text-[7px] font-extrabold">Pricing</text>
                      </g>
                      <g transform="translate(260,25)">
                        <circle r="7" fill="#e03e3e" className="animate-pulse" />
                        <circle r="3.5" fill="#ffffff" />
                        <text y="-12" textAnchor="middle" fill="rgba(255,255,255,0.6)" className="text-[7px] font-extrabold">Efficacy Risk</text>
                      </g>
                      <g transform="translate(360,40)">
                        <circle r="4" fill="rgba(255,255,255,0.3)" />
                        <text y="-10" textAnchor="middle" fill="rgba(255,255,255,0.4)" className="text-[7px] font-extrabold">Safety</text>
                      </g>
                    </svg>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Clusters topics across creator videos to flag campaign-wide contradictions.
                  </span>
                </div>

                {/* Card 5: pgvector Document Database Stack (Car Keys stacked style) */}
                <div 
                  style={{ animationDelay: "240ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:col-span-2 row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">Active RAG Store</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                      pgvector index active
                    </span>
                  </div>

                  <div className="my-2.5 flex items-center justify-center relative h-12">
                    <div className="absolute w-[80%] h-9 rounded-xl bg-[#1e1e24] border border-white/5 p-2 flex items-center justify-between opacity-40 transform -translate-y-2 scale-[0.92] transition-all duration-300 group-hover:-translate-y-3">
                      <span className="text-xs font-semibold text-white truncate">Skincare_Regs_FTC.pdf</span>
                      <span className="text-[8px] font-bold text-white/30">120 chunks</span>
                    </div>
                    <div className="absolute w-[86%] h-9 rounded-xl bg-[#1d1d22] border border-white/10 p-2 flex items-center justify-between opacity-70 transform -translate-y-1 scale-[0.96] transition-all duration-300 group-hover:-translate-y-1.5">
                      <span className="text-xs font-semibold text-white truncate">Marketing_Guidelines_V3.pdf</span>
                      <span className="text-[8px] font-bold text-white/50">45 chunks</span>
                    </div>
                    <div className="absolute w-[92%] h-9 rounded-xl bg-[#26262b] border border-white/15 p-2.5 flex items-center justify-between shadow-lg transform translate-y-0 transition-all duration-300 group-hover:translate-y-1">
                      <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" /> Hydration_Cream_FAQ.docx
                      </span>
                      <span className="text-[9px] font-extrabold text-accent bg-accent/10 px-2 py-0.5 rounded-full">84 chunks</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Validates script claims against specifications using tenant-scoped retrieval.
                  </span>
                </div>

                {/* Card 6: Tone Analyzer Siri Orb (Siri Orb Style) */}
                <div 
                  style={{ animationDelay: "300ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 relative z-10">
                    <Sparkle className="h-4 w-4 text-warn" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Perception Orb</span>
                  </div>

                  <div className="my-1.5 flex items-center justify-center relative h-16 w-full">
                    <div className="absolute h-14 w-14 rounded-full bg-gradient-to-tr from-accent via-warn to-bad blur-md opacity-75 animate-siri" />
                    <div className="absolute h-10 w-10 rounded-full bg-gradient-to-br from-white/20 to-transparent mix-blend-overlay border border-white/20" />
                    <span className="relative z-10 text-[9px] font-black text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/5 uppercase tracking-widest">
                      Low Risk
                    </span>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium relative z-10">
                    Identifies hyperbole or delivery triggers that threaten brand reputation.
                  </span>
                </div>

              </div>
            )}

            {activeTab === "creators" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-[155px]">
                
                {/* Card 1: Video Pre-Flight Review */}
                <div 
                  style={{ animationDelay: "0ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:col-span-2 row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">Video Pre-Flight</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-good bg-good/10 px-2 py-0.5 rounded">Audit Ready</span>
                  </div>

                  <div className="my-2 flex items-center gap-5 relative z-10">
                    <div className="h-16 w-24 rounded-xl bg-gradient-to-br from-accent/20 to-warn/10 relative overflow-hidden border border-white/5 flex items-center justify-center shrink-0">
                      <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur shadow-sm group-hover:scale-110 transition-transform">
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </div>
                      <div className="absolute left-0 right-0 h-0.5 bg-accent/80 shadow-[0_0_8px_#2383e2] animate-scanline" />
                    </div>

                    <div className="flex-1 space-y-1.5 text-xs text-white/80">
                      <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-good" /> Speech Transcribed</div>
                      <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-good" /> Tone Vetted (Neutral)</div>
                      <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-good" /> Sponsorship Flag Verified</div>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium relative z-10">
                    Runs compliance audits on raw video files in under 60 seconds before upload.
                  </span>
                </div>

                {/* Card 2: Speech Slip Flag */}
                <div 
                  style={{ animationDelay: "60ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warn" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Speech Slip Detector</span>
                  </div>

                  <div className="space-y-2.5 my-2.5 text-xs">
                    <div className="flex justify-start">
                      <div className="bg-[#18181c] border border-red-500/20 px-3.5 py-1.5 rounded-2xl rounded-tl-sm text-white font-medium max-w-[85%] relative">
                        "cures wrinkles instantly"
                        <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bad opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-bad"></span></span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-bad/10 border border-bad/20 text-bad px-3 py-1 rounded-xl text-[10px] font-extrabold max-w-[90%] shadow-sm leading-snug">
                        ⚠️ Hyperbole slip detected (0:24): violation risk
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Flags absolute claims that could trigger sponsor issues.
                  </span>
                </div>

                {/* Card 3: Tone Emojis */}
                <div 
                  style={{ animationDelay: "120ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Tonal Expression</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-2 text-[10px] font-extrabold">
                    <div className="bg-[#18181c] rounded-xl p-2 flex items-center gap-2 border border-white/5">
                      <span className="text-sm">😊</span>
                      <div>
                        <div className="text-white/80">Warmth</div>
                        <div className="text-good font-extrabold">High</div>
                      </div>
                    </div>
                    <div className="bg-[#18181c] rounded-xl p-2 flex items-center gap-2 border border-white/5">
                      <span className="text-sm">😮</span>
                      <div>
                        <div className="text-white/80">Excitement</div>
                        <div className="text-good font-extrabold">Normal</div>
                      </div>
                    </div>
                    <div className="bg-[#18181c] rounded-xl p-2 flex items-center gap-2 border border-white/5">
                      <span className="text-sm">😐</span>
                      <div>
                        <div className="text-white/80">Neutrality</div>
                        <div className="text-accent font-extrabold">Ideal</div>
                      </div>
                    </div>
                    <div className="bg-[#18181c] rounded-xl p-2 flex items-center gap-2 border border-white/5">
                      <span className="text-sm">🛡️</span>
                      <div>
                        <div className="text-white/80">Reputation</div>
                        <div className="text-good font-extrabold">Safe</div>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Measures bias and framing to guard against online backlash.
                  </span>
                </div>

                {/* Card 4: Contract Check */}
                <div 
                  style={{ animationDelay: "180ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Contract Check</span>
                  </div>

                  <div className="flex items-center gap-4 my-2">
                    <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#2383e2" strokeWidth="3" strokeDasharray="100" strokeDashoffset="5" strokeLinecap="round" />
                      </svg>
                      <span className="text-xs font-extrabold text-white">98%</span>
                    </div>

                    <div className="space-y-0.5 text-[9px] font-extrabold">
                      <div className="text-white">COMPATIBLE</div>
                      <div className="text-white/50">Competitor exclusions: Clear</div>
                      <div className="text-white/50">Required hashtag: Present</div>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Cross-checks script transcripts with active sponsor guidelines.
                  </span>
                </div>

                {/* Card 5: Publisher Checklist */}
                <div 
                  style={{ animationDelay: "240ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-good" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Publisher Gate</span>
                  </div>

                  <div className="space-y-1.5 my-2.5 text-[10px] font-bold text-white/90">
                    <div className="flex items-center gap-2"><div className="h-3.5 w-3.5 rounded bg-good/20 flex items-center justify-center text-good"><Check className="h-2.5 w-2.5" /></div> FTC Audit Approved</div>
                    <div className="flex items-center gap-2"><div className="h-3.5 w-3.5 rounded bg-good/20 flex items-center justify-center text-good"><Check className="h-2.5 w-2.5" /></div> Brand Slips Resolved</div>
                    <div className="flex items-center gap-2"><div className="h-3.5 w-3.5 rounded bg-good/20 flex items-center justify-center text-good"><Check className="h-2.5 w-2.5" /></div> Sponsor Requirements met</div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Guarantees draft publication safety before going live.
                  </span>
                </div>

                {/* Card 6: Audio Waveform (Full width) */}
                <div 
                  style={{ animationDelay: "300ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:col-span-3 row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">Timeline Waveform</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-bad bg-bad/10 px-2 py-0.5 rounded uppercase">
                      1 Audio slip flagged
                    </span>
                  </div>

                  <div className="my-2 h-14 flex items-end gap-1 px-4 relative">
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                      <div className="w-full h-0.5 bg-white/10" />
                    </div>
                    <div className="absolute top-0 bottom-0 left-[24%] w-0.5 bg-accent/80 z-10 shadow-[0_0_6px_#2383e2]" />
                    <span className="absolute top-1 left-[25%] text-[7px] font-bold text-accent z-10 bg-accent/15 px-1 rounded-sm">0:24</span>

                    {Array.from({ length: 48 }).map((_, idx) => {
                      const h = Math.abs(Math.sin(idx * 0.2)) * 36 + 6;
                      const isFlagged = idx >= 11 && idx <= 13;
                      return (
                        <div 
                          key={idx}
                          className={`w-1 rounded-t-sm transition-all duration-300 hover:opacity-100 flex-1`}
                          style={{
                            height: `${h}px`,
                            backgroundColor: isFlagged ? "#e03e3e" : "rgba(255,255,255,0.25)"
                          }}
                        />
                      );
                    })}
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Waveform map highlighting exact timestamps of compliance alerts.
                  </span>
                </div>

              </div>
            )}

            {activeTab === "viewers" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-[155px]">
                
                {/* Card 1: Video Search Console */}
                <div 
                  style={{ animationDelay: "0ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:col-span-2 row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent pointer-events-none opacity-30" />
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Link Verifier Console</span>
                  </div>

                  <div className="my-2.5 relative">
                    <div className="w-full bg-[#18181c] border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs text-white/80 select-none shadow-inner">
                      <span className="flex items-center gap-2 truncate font-medium">
                        <span className="text-accent">🔗</span>
                        <span>https://www.youtube.com/watch?v=TL984d72</span>
                        <span className="h-4 w-[1.5px] bg-accent animate-cursor inline-block" />
                      </span>
                      <span className="text-[10px] text-accent font-extrabold bg-accent/10 px-2.5 py-1 rounded-lg">VERIFY</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 px-1 text-[9px] font-extrabold text-white/40">
                      <span>Platform feeds:</span>
                      <span className="flex items-center gap-1 text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-[#ff0000]" /> YouTube</span>
                      <span className="flex items-center gap-1 text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> TikTok</span>
                      <span className="flex items-center gap-1 text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-bad" /> Instagram</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Paste public video links to instantly trigger our deep extraction pipelines.
                  </span>
                </div>

                {/* Card 2: Deepfake Scanner */}
                <div 
                  style={{ animationDelay: "60ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 relative z-10">
                    <Eye className="h-4 w-4 text-good" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Deepfake Scanner</span>
                  </div>

                  <div className="my-1.5 flex items-center justify-center relative h-16 w-full">
                    <div className="absolute h-14 w-14 rounded-full border border-good/20 flex items-center justify-center">
                      <div className="absolute h-10 w-10 rounded-full border border-good/10" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-good/30 to-transparent animate-radar pointer-events-none" />
                      <div className="h-1.5 w-1.5 bg-good rounded-full animate-pulse z-10" />
                    </div>
                    <div className="absolute right-5 space-y-0.5 text-[8.5px] font-extrabold text-right z-10 leading-none">
                      <div className="text-good">VOICE CLONE</div>
                      <div className="text-white">96% CONFIDENCE</div>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium relative z-10">
                    Analyzes voice cloning, face swaps, and splicing artifacts.
                  </span>
                </div>

                {/* Card 3: Spoken Claims (Tall widget, spans 2 rows) */}
                <div 
                  style={{ animationDelay: "120ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:row-span-2 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Statement Registry</span>
                  </div>

                  <div className="my-4 space-y-2.5 flex-1 overflow-hidden">
                    <div className="bg-[#18181c] border border-white/5 rounded-xl p-2.5 flex flex-col gap-1 hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                        <span className="text-white/80 truncate max-w-[70%]">"100% natural ingredients"</span>
                        <span className="text-good bg-good/10 px-1.5 py-0.25 rounded text-[8px]">VERIFIED</span>
                      </div>
                      <span className="text-[8.5px] text-white/40 font-medium leading-none">Citations present in FDA logs</span>
                    </div>

                    <div className="bg-[#18181c] border border-white/5 rounded-xl p-2.5 flex flex-col gap-1 hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                        <span className="text-white/80 truncate max-w-[70%]">"Cures wrinkles in 3 days"</span>
                        <span className="text-[#e03e3e] bg-[#e03e3e]/10 px-1.5 py-0.25 rounded text-[8px]">CONTRADICTED</span>
                      </div>
                      <span className="text-[8.5px] text-[#e03e3e]/65 font-medium leading-none">Clinical trials disprove timeline</span>
                    </div>

                    <div className="bg-[#18181c] border border-white/5 rounded-xl p-2.5 flex flex-col gap-1 hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                        <span className="text-white/80 truncate max-w-[70%]">"Dermatologist tested"</span>
                        <span className="text-good bg-good/10 px-1.5 py-0.25 rounded text-[8px]">VERIFIED</span>
                      </div>
                      <span className="text-[8.5px] text-white/40 font-medium leading-none">Medical approval certificate active</span>
                    </div>

                    <div className="bg-[#18181c] border border-white/5 rounded-xl p-2.5 flex flex-col gap-1 hover:border-white/10 transition-all opacity-40">
                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                        <span className="text-white/80 truncate">"Reduces dark spots"</span>
                        <span className="text-white/30 bg-white/5 px-1.5 py-0.25 rounded text-[8px]">PENDING</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Extracts every spoken assertion and provides evidence-backed verdicts.
                  </span>
                </div>

                {/* Card 4: Tavily Citations */}
                <div 
                  style={{ animationDelay: "180ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:col-span-2 row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">Tavily Fact Check Engine</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-[#2383e2] bg-[#2383e2]/10 border border-[#2383e2]/25 px-2.5 py-0.5 rounded-full animate-pulse">
                      Live Web RAG
                    </span>
                  </div>

                  <div className="my-2 flex items-center justify-center relative h-12">
                    <div className="absolute w-[82%] h-8.5 rounded-xl bg-[#1e1e24] border border-white/5 p-2 flex items-center justify-between opacity-30 transform -translate-y-2 scale-[0.93] group-hover:-translate-y-3 transition-all duration-300">
                      <span className="text-[10px] font-semibold text-white truncate">PubMed Study #PMC32918</span>
                    </div>
                    <div className="absolute w-[88%] h-8.5 rounded-xl bg-[#1d1d22] border border-white/10 p-2 flex items-center justify-between opacity-60 transform -translate-y-1.5 scale-[0.96] group-hover:-translate-y-2.5 transition-all duration-300">
                      <span className="text-[10px] font-semibold text-white truncate">NIH Clinical trials database report</span>
                    </div>
                    <div className="absolute w-[94%] h-8.5 rounded-xl bg-[#26262b] border border-white/15 p-2 flex items-center justify-between shadow-lg transform translate-y-0 group-hover:translate-y-1 transition-all duration-300">
                      <span className="text-[10px] font-bold text-white truncate flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> FDA Cosmetics Regs Sec 12
                      </span>
                      <span className="text-[8px] font-extrabold text-accent bg-accent/15 px-2 py-0.5 rounded-full">ACTIVE MATCH</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Cross-references verbal statements with live clinical and legislative registries.
                  </span>
                </div>

                {/* Card 5: Verification Map */}
                <div 
                  style={{ animationDelay: "240ms" }}
                  className="card-anim rounded-[24px] bg-[#121215]/85 border border-white/5 p-5 flex flex-col justify-between text-left lg:col-span-2 row-span-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-good/10 via-transparent to-transparent pointer-events-none opacity-30" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-good" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">Verification Map</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-white/50">Clip Timeline</span>
                  </div>

                  <div className="my-2 h-14 relative flex items-center justify-center">
                    <svg className="w-full h-full text-white/20" viewBox="0 0 380 60">
                      <path d="M 15 30 L 100 30 L 180 30 L 280 30 L 365 30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 15 30 L 100 30 L 180 30 L 280 30 L 365 30" fill="none" stroke="url(#route-grad)" strokeWidth="2" />
                      
                      <defs>
                        <linearGradient id="route-grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0f7b6c" />
                          <stop offset="50%" stopColor="#e03e3e" />
                          <stop offset="75%" stopColor="#0f7b6c" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                        </linearGradient>
                      </defs>

                      <g transform="translate(15,30)">
                        <circle r="5.5" fill="#0f7b6c" />
                        <circle r="2" fill="#ffffff" />
                        <text y="-10" textAnchor="middle" fill="rgba(255,255,255,0.6)" className="text-[7.5px] font-extrabold">0:00</text>
                      </g>
                      <g transform="translate(100,30)">
                        <circle r="5" fill="#0f7b6c" />
                        <circle r="2" fill="#ffffff" />
                        <text y="-10" textAnchor="middle" fill="rgba(255,255,255,0.6)" className="text-[7.5px] font-extrabold">0:15</text>
                      </g>
                      <g transform="translate(180,30)">
                        <circle r="6.5" fill="#e03e3e" className="animate-pulse" />
                        <circle r="2.5" fill="#ffffff" />
                        <text y="-10" textAnchor="middle" fill="#e03e3e" className="text-[7.5px] font-extrabold">0:32 Alert</text>
                      </g>
                      <g transform="translate(280,30)">
                        <circle r="5" fill="#0f7b6c" />
                        <circle r="2" fill="#ffffff" />
                        <text y="-10" textAnchor="middle" fill="rgba(255,255,255,0.6)" className="text-[7.5px] font-extrabold">0:50</text>
                      </g>
                      <g transform="translate(365,30)">
                        <circle r="4" fill="rgba(255,255,255,0.2)" />
                        <text y="-10" textAnchor="middle" fill="rgba(255,255,255,0.3)" className="text-[7.5px] font-extrabold">1:20</text>
                      </g>
                    </svg>
                  </div>

                  <span className="text-[10px] text-white/40 font-medium">
                    Plots factual accuracy timeline and citation checkpoints.
                  </span>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
