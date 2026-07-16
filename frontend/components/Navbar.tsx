"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRole, routeForRole } from "@/lib/api";
import { Layers, ArrowRight } from "@/components/icons";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  // null = unknown (checking), false = signed out, string = dashboard route
  const [dashboardHref, setDashboardHref] = useState<string | false | null>(null);

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

  // Visiting the landing page does NOT sign the user out — reflect an existing
  // Supabase session by offering a way back into the logged-in app.
  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session) {
          setDashboardHref(routeForRole(getRole() || ""));
        } else {
          setDashboardHref(false);
        }
      })
      .catch(() => !cancelled && setDashboardHref(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const signedIn = typeof dashboardHref === "string";

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
            {signedIn ? (
              <Link href={dashboardHref as string} className="btn-white">
                Dashboard <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 rounded-full text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition">Sign in</Link>
                <Link href="/register" className="btn-white">
                  Get started <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Collapsed / Shrunk Button (no wrapper outline) */}
        {scrolled && (
          <Link
            href={signedIn ? (dashboardHref as string) : "/register"}
            className="btn w-full h-full text-xs py-1 px-3 gap-1 whitespace-nowrap animate-fade-in"
          >
            {signedIn ? "Dashboard" : "Get started"} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </header>
  );
}
