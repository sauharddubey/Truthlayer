"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboard } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { VideoBoard } from "@/components/VideoBoard";
import { Eye } from "@/components/icons";

export default function CreatorDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { getDashboard("creator").then(setData).catch((e) => setError(e.message)); }, []);

  const cards = data?.videos || [];

  return (
    <AppShell title="My videos" wide>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-light">How every draft will land — tap a block to see what to fix.</p>
        <Link href="/analyze" className="btn-accent">
          <Eye className="h-3.5 w-3.5" /> Check a video
        </Link>
      </div>
      {error && <p className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</p>}
      <VideoBoard videos={cards} />
    </AppShell>
  );
}
