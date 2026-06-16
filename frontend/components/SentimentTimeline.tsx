"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SentimentTimeline({ timeline }: { timeline: any[] }) {
  const data = timeline.map((t) => ({
    t: typeof t.timestamp === "number" ? Math.round(t.timestamp) : t.timestamp,
    sentiment: t.sentiment === "positive" ? 1 : t.sentiment === "negative" ? -1 : 0,
    intensity: t.intensity ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#9b9a97" }} stroke="#e9e9e7" />
        <YAxis domain={[-1, 1]} ticks={[-1, 0, 1]} tick={{ fontSize: 11, fill: "#9b9a97" }} stroke="#e9e9e7" />
        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e9e9e7", borderRadius: 8, fontSize: 12 }} />
        <Line type="monotone" dataKey="sentiment" stroke="#2383e2" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="intensity" stroke="#cb912f" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
