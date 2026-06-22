"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { clearAuth, getRole } from "@/lib/api";
import { Layers, FileSearch, Eye, Scale, Sparkle, Settings, LogOut, Home, Box, Sun, Moon, HelpCircle, ArrowRight, Check } from "@/components/icons";

type Item = { href: string; label: string; icon: ReactNode };

function navFor(role: string | null): Item[] {
  if (role === "business")
    return [
      { href: "/dashboard/brand", label: "Brand", icon: <Sparkle className="h-4 w-4" /> },
      { href: "/products", label: "Products", icon: <Box className="h-4 w-4" /> },
      { href: "/analyze", label: "Analyze", icon: <FileSearch className="h-4 w-4" /> },
    ];
  if (role === "creator")
    return [
      { href: "/dashboard/creator", label: "My videos", icon: <Home className="h-4 w-4" /> },
      { href: "/analyze", label: "Check", icon: <Eye className="h-4 w-4" /> },
    ];
  if (role === "verifier")
    return [
      { href: "/dashboard/verifier", label: "My checks", icon: <Home className="h-4 w-4" /> },
      { href: "/analyze", label: "Fact-check", icon: <Scale className="h-4 w-4" /> },
    ];
  return [];
}

const ROLE_COLOR: Record<string, string> = { business: "#2383e2", creator: "#0f7b6c", verifier: "#cb912f" };

export function DynamicNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  useEffect(() => {
    setRole(getRole());
  }, [pathname]);

  useEffect(() => {
    // Check local storage / media query for dark theme
    const active = localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (active) {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
    }

    // Auto-show onboarding guide if user hasn't seen it
    const hasSeen = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeen && getRole()) {
      setShowGuide(true);
    }
  }, []);

  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDarkMode(true);
    }
  };

  const closeGuide = () => {
    setShowGuide(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  };

  const items = navFor(role);
  const dot = role ? ROLE_COLOR[role] : "#2383e2";

  const guideSteps = [
    {
      title: "Welcome to TruthLayer",
      content: "TruthLayer is an AI trust, compliance & media-intelligence platform for video. We transcribe, analyze, and grade video content through specialized AI agents.",
    },
    {
      title: "Three User Workspaces",
      content: "The platform tailors itself to exactly three user profiles:\n\n• Business: Verify marketing videos against uploaded specs/guidelines and check narratives.\n• Creator: Self-check factual accuracy, perception risks, tone, and emotional intensity before posting.\n• Verifier: Standard AI fact-checking of public claims.",
    },
    {
      title: "Understanding Trust & Risk",
      content: "We compute several metrics to grade content trust:\n\n• Trust Score: Low score indicates unverified, contradicted, or biased claims.\n• Risk Score: Aggregates creator risk, compliance issues, and emotional manipulation.\n• Authenticity: Flags deepfakes, synthetic speech, or unauthorized endorsements.",
    },
    {
      title: "Knowledge Base & Verification",
      content: "In Business Workspaces, you can upload PDFs/DOCX/TXT specification sheets and policies. The platform automatically retrieves context via semantic vector RAG search to auto-verify claims in ingested videos.",
    },
    {
      title: "Install App & Share Directly",
      content: "Install TruthLayer as a web app on your phone to share videos directly from native apps:\n\n• Why: Bypasses manual copy-pasting. Audits are started directly from your system's share sheet.\n• iOS (Safari): Tap the 'Share' button, scroll down, and tap 'Add to Home Screen'.\n• Android (Chrome): Tap the browser menu and select 'Install App' or 'Add to Home Screen'.\n\nOnce installed, TruthLayer will appear inside your phone's native Share Sheet menu!",
    },
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="island flex items-center gap-1 rounded-full px-2 py-1.5 text-paper">
          {/* brand dot */}
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
            <Layers className="h-4 w-4" />
          </Link>
          <span className="mx-0.5 h-5 w-px bg-white/10" />

          {/* primary links */}
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  active ? "bg-white text-ink shadow" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {it.icon}
                <span className="hidden sm:inline">{it.label}</span>
              </Link>
            );
          })}

          <span className="mx-0.5 h-5 w-px bg-white/10" />

          {/* theme toggle */}
          <button
            onClick={toggleTheme}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* onboarding guide */}
          {role && (
            <button
              onClick={() => { setGuideStep(0); setShowGuide(true); }}
              title="Show guide"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}

          <span className="mx-0.5 h-5 w-px bg-white/10" />

          {role ? (
            <>
              {/* utility settings */}
              <Link
                href="/settings"
                title="Settings"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  pathname === "/settings" ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Settings className="h-4 w-4" />
              </Link>
              
              <button
                title="Sign out"
                onClick={async () => { await clearAuth(); router.push("/"); }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-bad/20 hover:text-bad"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* role indicator */}
              <span className="ml-1 mr-1.5 h-2 w-2 rounded-full" style={{ background: dot }} title={role || ""} />
            </>
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center justify-center rounded-full px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Onboarding Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-pop text-ink">
            <h3 className="font-display text-lg font-bold text-ink mb-3">{guideSteps[guideStep].title}</h3>
            
            <p className="text-sm text-ink-light leading-relaxed whitespace-pre-line min-h-[120px]">
              {guideSteps[guideStep].content}
            </p>

            <div className="mt-6 flex items-center justify-between">
              {/* step dots */}
              <div className="flex gap-1.5">
                {guideSteps.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      idx === guideStep ? "bg-accent w-4" : "bg-ink-faint/30"
                    }`}
                  />
                ))}
              </div>

              {/* buttons */}
              <div className="flex gap-2">
                {guideStep > 0 && (
                  <button
                    className="btn-ghost px-3 py-1.5 text-xs"
                    onClick={() => setGuideStep((s) => s - 1)}
                  >
                    Back
                  </button>
                )}
                {guideStep < guideSteps.length - 1 ? (
                  <button
                    className="btn px-3 py-1.5 text-xs flex items-center gap-1"
                    onClick={() => setGuideStep((s) => s + 1)}
                  >
                    Next <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    className="btn-accent px-3 py-1.5 text-xs flex items-center gap-1"
                    onClick={closeGuide}
                  >
                    Got it <Check className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
