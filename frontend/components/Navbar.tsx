"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Layers, ArrowRight } from "@/components/icons";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 transition-all duration-300">
      <div 
        className={`flex items-center justify-between transition-all duration-300 shadow-pop overflow-hidden ${
          scrolled 
            ? "w-[125px] h-[36px] bg-transparent border-none shadow-none" 
            : "w-full max-w-4xl h-[48px] px-5 bg-ink text-paper rounded-full border border-white/5"
        }`}
      >
        {/* Full Expanded Island */}
        <div 
          className={`flex w-full items-center justify-between transition-all duration-300 ${
            scrolled ? "opacity-0 pointer-events-none scale-95 hidden" : "opacity-100 scale-100"
          }`}
        >
          <Link href="/" className="flex items-center gap-2 text-paper hover:opacity-90 transition">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper text-ink">
              <Layers className="h-4 w-4" />
            </span>
            <span className="font-extrabold tracking-tight text-sm text-white">TruthLayer</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#why-truthlayer" className="px-3 py-1.5 rounded-full text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition">Utility</a>
            <a href="#pipeline" className="px-3 py-1.5 rounded-full text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition">Pipeline</a>
            <a href="#audiences" className="px-3 py-1.5 rounded-full text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition">Tiers</a>
          </nav>
          <nav className="flex items-center gap-1">
            <Link href="/login" className="px-3 py-1.5 rounded-full text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition">Sign in</Link>
            <Link href="/register" className="btn-white">
              Get started <ArrowRight className="h-3 w-3" />
            </Link>
          </nav>
        </div>

        {/* Collapsed / Shrunk Get Started Button (no wrapper outline) */}
        {scrolled && (
          <Link 
            href="/register" 
            className="btn w-full h-full text-xs py-1 px-3 gap-1 whitespace-nowrap animate-fade-in"
          >
            Get started <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </header>
  );
}
