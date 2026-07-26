"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PhoneMock } from "@/components/PhoneMock";
import {
  ArrowRight, ShieldCheck, Check, AlertTriangle, FileSearch, ChevronDown,
} from "@/components/icons";

/**
 * Pinned, scroll-driven hero — centered stack: headline, subtitle and CTAs on
 * top, the phone rising into place beneath them with floating liquid-glass
 * claim bubbles at its sides. Nothing ever overlaps the copy.
 */
export function HeroScroll() {
  const section = useRef<HTMLElement>(null);
  const headline = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const bubbles = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = section.current;
    if (!sec) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    const apply = () => {
      const rect = sec.getBoundingClientRect();
      const total = sec.offsetHeight - window.innerHeight;
      const p = reduce ? 1 : clamp(-rect.top / Math.max(1, total));

      // Phone rises on scroll (settled at p = 0.85); bubbles fade in behind it
      const rise = clamp(p / 0.85);
      const appear = clamp((p - 0.25) / 0.55);

      if (headline.current) {
        headline.current.style.transform = `translateY(${-rise * 14}px)`;
      }
      if (phone.current) {
        const y = (1 - rise) * 220;
        const scale = 0.92 + rise * 0.08;
        phone.current.style.transform = `translateY(${y}px) scale(${scale})`;
      }
      if (bubbles.current) {
        bubbles.current.style.opacity = `${appear}`;
      }
      if (hint.current) hint.current.style.opacity = `${1 - rise * 2}`;
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Desktop: pinned scroll stage */}
      <section ref={section} className="relative hidden md:block" style={{ height: "135vh" }}>
        <div className="sticky top-0 flex h-screen flex-col items-center overflow-hidden">

          {/* top: centered headline + copy + CTA */}
          <div ref={headline} className="relative z-10 flex flex-col items-center pt-[92px] text-center will-change-transform">
            <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-[13px] font-semibold uppercase tracking-wider text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(10,122,255,0.8)]" />
              AI video fact-checking
            </span>
            <h1 className="font-heavy text-[5rem] leading-[0.98] tracking-[-0.04em] text-ink lg:text-[6.5rem]">
              Truth in <span className="text-shine">every video.</span>
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-ink-light">
              Calibrated trust, parallel analyses, and automated verification — before your audience ever presses play.
            </p>
            <div className="mt-9 flex gap-3">
              <Link href="/register" className="btn-accent px-7 py-3.5 text-base">Start free <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/docs" className="btn-ghost px-7 py-3.5 text-base">See how we help</Link>
            </div>
          </div>

          {/* below: phone rising into place, glass bubbles at its sides */}
          <div className="relative mt-8 w-full max-w-4xl flex-1">
            <div ref={phone} className="absolute left-1/2 top-0 z-20 ml-[-130px] w-[260px] will-change-transform" style={{ transform: "translateY(220px) scale(0.92)" }}>
              <PhoneMock />
            </div>
            <div ref={bubbles} className="pointer-events-none absolute inset-0 z-30 opacity-0 will-change-transform">
              <GlassBubble className="right-[calc(50%_+_175px)] top-[60px] float-a" tone="good" icon={<Check className="h-3 w-3" />} msg="Supported claim" name="Wyatt" />
              <GlassBubble className="right-[calc(50%_+_195px)] top-[240px] float-b" tone="warn" icon={<AlertTriangle className="h-3 w-3" />} msg="1 compliance risk" name="Miles" />
              <GlassBubble className="right-[calc(50%_+_170px)] top-[420px] float-a" tone="accent" icon={<FileSearch className="h-3 w-3" />} msg="Product alias matched" name="Servan" />
              <GlassBubble className="left-[calc(50%_+_175px)] top-[120px] float-b" tone="accent" icon={<FileSearch className="h-3 w-3" />} msg="Evidence linked" name="Alina" />
              <GlassBubble className="left-[calc(50%_+_195px)] top-[300px] float-a" tone="good" icon={<ShieldCheck className="h-3 w-3" />} msg="Deepfake check" name="Emma" />
              <GlassBubble className="left-[calc(50%_+_170px)] top-[470px] float-b" tone="good" icon={<Check className="h-3 w-3" />} msg="Calibrated confidence" name="Sauhard" />
            </div>
          </div>

          {/* scroll hint */}
          <div ref={hint} className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 text-ink-faint">
            <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Mobile static hero */}
      <section className="px-6 py-12 text-center md:hidden">
        <h1 className="font-heavy text-5xl leading-[1.02] tracking-[-0.03em] text-ink">
          Truth in<br /><span className="text-shine">every video.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-sm text-ink-light">Calibrated trust, parallel analyses, and evidence verification.</p>
        <div className="mt-8 flex justify-center"><PhoneMock /></div>
        <Link href="/register" className="btn-accent mt-8 px-6 py-3">Start free <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </>
  );
}

const TONE: Record<string, string> = {
  good: "rgb(var(--good))",
  warn: "rgb(var(--warn))",
  accent: "rgb(var(--accent))",
};

function GlassBubble({ className = "", tone, icon, msg, name }: {
  className?: string; tone: "good" | "warn" | "accent"; icon: React.ReactNode; msg: string; name: string;
}) {
  return (
    <div className={`absolute ${className}`}>
      <div className="island flex w-max items-center gap-2.5 rounded-full py-2.5 pl-3 pr-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: TONE[tone] }}>
          {icon}
        </span>
        <span className="text-sm font-semibold text-ink">{msg}</span>
        <span className="text-xs font-bold text-ink-faint">{name}</span>
      </div>
    </div>
  );
}
