"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PhoneMock } from "@/components/PhoneMock";
import {
  ArrowRight, ShieldCheck, Check, AlertTriangle, Sparkle, Play, AudioLines, ChevronDown,
} from "@/components/icons";

/**
 * Pinned, scroll-driven hero. The giant headline sits behind the phone; as you
 * scroll, the phone rises and scales toward you, the headline recedes, and the
 * floating bubbles + stickers spread apart and fade — creating a premium storytelling reveal.
 */
export function HeroScroll() {
  const section = useRef<HTMLElement>(null);
  const headline = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLDivElement>(null);
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
      const p = reduce ? 0 : clamp(-rect.top / Math.max(1, total));

      // Continuous scale: phone rises on scroll (reaches full state at p = 0.85)
      const rise = clamp(p / 0.85);
      const appear = clamp((p - 0.2) / 0.6); // bubbles and CTA fade in between 20% and 80%

      if (headline.current) {
        headline.current.style.transform = `translateY(${-rise * 40}px) scale(${1 + rise * 0.05})`;
        headline.current.style.opacity = `${1 - rise * 0.25}`;
      }
      
      if (phone.current) {
        const y = (1 - rise) * 520;
        const scale = 0.8 + rise * 0.05; // settle at 0.85 scale to ensure perfect spacing
        phone.current.style.transform = `translate(-50%, ${y}px) scale(${scale})`;
        phone.current.style.opacity = "1";
      }

      const groupOpacity = `${appear}`;
      if (left.current) {
        left.current.style.transform = `translateX(${(1 - appear) * -120}px)`;
        left.current.style.opacity = groupOpacity;
      }
      if (right.current) {
        right.current.style.transform = `translateX(${(1 - appear) * 120}px)`;
        right.current.style.opacity = groupOpacity;
      }
      if (cta.current) {
        cta.current.style.transform = "translateY(0px)";
        cta.current.style.opacity = groupOpacity;
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
      {/* Desktop: pinned scroll stage - 120vh scroll height for smooth, gradual timing */}
      <section ref={section} className="relative hidden md:block" style={{ height: "120vh" }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          {/* soft tint */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle,#e7f3fb,transparent 70%)" }} />

          <div className="relative mx-auto h-[640px] w-full max-w-6xl px-6">
            {/* giant headline (behind) */}
            <div ref={headline} className="pointer-events-none absolute inset-x-0 top-[45px] z-0 text-center font-heavy uppercase leading-[0.8] tracking-tight text-ink will-change-transform">
              <span className="block text-[7rem] lg:text-[9rem]">Truth in</span>
              <span className="block text-[7rem] lg:text-[9rem]">every video</span>
            </div>

            {/* phone (front) — starts below the fold - Slimmed w-[260px] wrapper */}
            <div ref={phone} className="absolute left-1/2 top-[25px] z-20 w-[260px] will-change-transform" style={{ transform: "translate(-50%,520px) scale(0.8)" }}>
              <PhoneMock />
            </div>

            {/* left cluster */}
            <div ref={left} className="absolute inset-0 z-30 opacity-0 will-change-transform pointer-events-none">
              <Bubble className="left-[6%] top-[140px]" side="right" msg="Supported claim" name="Wyatt" seed="b1" />
              <Bubble className="left-[2%] top-[330px]" side="right" msg="1 compliance risk" name="Miles" seed="b2" />
              <Bubble className="left-[9%] top-[510px]" side="right" msg="Clean deepfake check" name="Emma" seed="b3" />
              <Sticker className="left-[20%] top-[420px]" rot={-12} grad="linear-gradient(135deg,#2383e2,#5eb0f0)"><ShieldCheck className="h-7 w-7" /></Sticker>
              <Sticker className="left-[8%] top-[560px]" rot={14} grad="linear-gradient(135deg,#e03e3e,#ff7a7a)"><AlertTriangle className="h-7 w-7" /></Sticker>
              <Sticker className="left-[26%] top-[600px]" rot={-6} grad="linear-gradient(135deg,#9b59ff,#c79bff)"><Play className="h-6 w-6" /></Sticker>
            </div>

            {/* right cluster */}
            <div ref={right} className="absolute inset-0 z-30 opacity-0 will-change-transform pointer-events-none">
              <div className="absolute right-[12%] top-[40px] flex items-center gap-1.5">
                <span className="text-sm font-semibold text-ink">Sauhard</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper text-xs font-bold text-white shadow-card" style={{ background: "#37352f" }}>S</span>
              </div>
              <Bubble className="right-[5%] top-[270px]" side="left" msg="Factual evidence linked" name="Alina" seed="b4" />
              <Bubble className="right-[2%] top-[470px]" side="left" msg="Product alias matched" name="Servan" seed="b5" />
              <Sticker className="right-[18%] top-[130px]" rot={10} grad="linear-gradient(135deg,#0f7b6c,#3fbfa9)"><Check className="h-7 w-7" /></Sticker>
              <Sticker className="right-[20%] top-[520px]" rot={-8} grad="linear-gradient(135deg,#cb912f,#f0c14b)"><Sparkle className="h-7 w-7" /></Sticker>
              <Sticker className="right-[26%] top-[600px]" rot={9} grad="linear-gradient(135deg,#37352f,#6b6862)"><AudioLines className="h-7 w-7" /></Sticker>
            </div>

            {/* CTA — Positioned bottom-[10px] inside parent to prevent clipping */}
            <div ref={cta} className="absolute inset-x-0 bottom-[10px] z-30 flex flex-col items-center gap-3 opacity-0 will-change-transform">
              <p className="max-w-md text-center text-sm font-semibold text-ink-light">Calibrated trust, parallel analyses, and automated verification.</p>
              <div className="flex gap-3">
                <Link href="/register" className="btn px-6 py-2.5 text-sm font-bold uppercase tracking-wider">Start free <ArrowRight className="h-3.5 w-3.5" /></Link>
                <Link href="/docs" className="btn-ghost px-6 py-2.5 text-sm font-bold uppercase tracking-wider">See how we help</Link>
              </div>
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
        <h1 className="font-heavy text-6xl uppercase leading-[0.85] tracking-tight text-ink">Truth in every video</h1>
        <p className="mx-auto mt-4 max-w-xs text-sm text-ink-light">Calibrated trust, parallel analyses, and evidence verification.</p>
        <div className="mt-6 flex justify-center"><PhoneMock /></div>
        <Link href="/register" className="btn mt-8 px-5 py-3">Start free <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </>
  );
}

const AV: Record<string, string> = { b1: "#2383e2", b2: "#0f7b6c", b3: "#cb912f", b4: "#9b59ff", b5: "#e03e3e", luke: "#37352f" };

function Avatar({ name, seed }: { name: string; seed: string }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm" style={{ background: AV[seed] || "#2383e2" }}>
      {name[0]}
    </span>
  );
}

function Bubble({ className = "", msg, name, seed, side }: { className?: string; msg: string; name: string; seed: string; side: "left" | "right" }) {
  return (
    <div className={`absolute ${side === "right" ? "float-a" : "float-b"} ${className}`}>
      <div className="w-max rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink shadow-card">{msg}</div>
      <div className={`mt-1 flex items-center gap-1.5 ${side === "right" ? "justify-end" : "justify-start"}`}>
        {side === "left" && <Avatar name={name} seed={seed} />}
        <span className="text-[10px] font-bold text-ink-light">{name}</span>
        {side === "right" && <Avatar name={name} seed={seed} />}
      </div>
    </div>
  );
}

function Sticker({ className = "", grad, rot = 0, children }: { className?: string; grad: string; rot?: number; children: React.ReactNode }) {
  return (
    <div className={`absolute ${rot % 2 ? "float-a" : "float-b"} ${className}`} style={{ ["--r" as any]: `${rot}deg` }}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-pop" style={{ background: grad, transform: `rotate(${rot}deg)` }}>
        {children}
      </div>
    </div>
  );
}
