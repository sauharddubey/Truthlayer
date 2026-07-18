"use client";

import { ReactNode } from "react";
import { DynamicNav } from "@/components/DynamicNav";
import { ApiKeyGate } from "@/components/ApiKeyGate";

/** App chrome: a floating dynamic-island nav + full-width content (no sidebar). */
export function AppShell({ children, title, wide = false }: { children: ReactNode; title?: string; wide?: boolean }) {
  return (
    <ApiKeyGate>
      <div className="min-h-screen">
        <DynamicNav />
        <main className={`n-fade mx-auto px-5 pb-10 pt-24 sm:px-8 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
          {title && (
            <div className="mb-6">
              <h1 className="font-heavy text-4xl text-ink">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
    </ApiKeyGate>
  );
}
