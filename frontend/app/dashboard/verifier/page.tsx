"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboard } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { VideoBoard } from "@/components/VideoBoard";
import { Scale } from "@/components/icons";

export default function VerifierDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { getDashboard("verifier").then(setData).catch((e) => setError(e.message)); }, []);

  const videos = data?.videos || [];
  const removeVideo = (videoId: string) => {
    setData((current: any) => ({
      ...current,
      videos: (current?.videos || []).filter((v: any) => v.video_id !== videoId),
    }));
  };

  return (
    <AppShell title="My checks" wide>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-light">Every public video you've fact-checked — tap a block for the verdict.</p>
        <Link href="/analyze" className="btn-accent">
          <Scale className="h-3.5 w-3.5" /> Fact-check a video
        </Link>
      </div>
      {error && <p className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</p>}
      <VideoBoard videos={videos} variant="verifier" onDeleted={removeVideo} />
    </AppShell>
  );
}
