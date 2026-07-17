"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getDashboard } from "@/lib/api";
import { useRefetchOnVisible } from "@/lib/useRefetchOnVisible";
import { useRoleGuard } from "@/lib/useRoleGuard";
import { AppShell } from "@/components/AppShell";
import { VideoBoard } from "@/components/VideoBoard";
import { Eye } from "@/components/icons";

export default function CreatorDashboard() {
  const guardOk = useRoleGuard(["creator"]);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getDashboard("creator")
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  // A video may still be processing when the user leaves — refresh on return.
  useRefetchOnVisible(load);

  const cards = data?.videos || [];
  const removeVideo = (videoId: string) => {
    setData((current: any) => ({
      ...current,
      videos: (current?.videos || []).filter((v: any) => v.video_id !== videoId),
    }));
  };

  if (!guardOk) {
    return (
      <AppShell title="My videos" wide>
        <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="My videos" wide>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-light">How every draft will land — tap a block to see what to fix.</p>
        <Link href="/analyze" className="btn-accent">
          <Eye className="h-3.5 w-3.5" /> Check a video
        </Link>
      </div>
      {error && <p className="mb-4 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</p>}
      <VideoBoard videos={cards} onDeleted={removeVideo} loading={loading} searchable={cards.length > 6} />
    </AppShell>
  );
}
