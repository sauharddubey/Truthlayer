"use client";

import { ReactNode } from "react";
import { DynamicNav } from "@/components/DynamicNav";

/** App chrome: a floating dynamic-island nav + full-width content (no sidebar). */
export function AppShell({ children, title, wide = false }: { children: ReactNode; title?: string; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-paper">
      <DynamicNav />
      <main className={`n-fade mx-auto px-5 pb-10 pt-24 sm:px-8 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
        {title && (
          <div className="mb-6">
            <h1 className="font-heavy text-3xl uppercase tracking-tight text-ink">{title}</h1>
            <div className="mt-2 h-0.5 w-12 rounded-full bg-accent" />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
