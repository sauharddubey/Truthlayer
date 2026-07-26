"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Sentiment + intensity line chart.
 * `compact` renders an axis-free sparkline that fills its parent (for bento
 * tiles); the default renders the full labelled chart (for the modal).
 */
export function SentimentTimeline({ timeline, compact = false }: { timeline: any[]; compact?: boolean }) {
  const data = timeline.map((t) => ({
    t: typeof t.timestamp === "number" ? Math.round(t.timestamp) : t.timestamp,
    sentiment: t.sentiment === "positive" ? 1 : t.sentiment === "negative" ? -1 : 0,
    intensity: t.intensity ?? 0,
  }));
  return (
    <figure className="m-0 h-full" aria-label="Sentiment and intensity over the video timeline">
      <figcaption className="sr-only">
        Line chart plotting the speaker&apos;s sentiment (solid blue line, ranging from
        negative to positive) and emotional intensity (dashed orange line) across the
        video&apos;s timeline.
      </figcaption>
      <ResponsiveContainer width="100%" height={compact ? "100%" : 200}>
        {/* Compact margins pad the ±1 domain edges so the stroke isn't clipped */}
        <LineChart data={data} accessibilityLayer margin={compact ? { top: 8, right: 4, bottom: 8, left: 4 } : undefined}>
          <XAxis dataKey="t" hide={compact} tick={{ fontSize: 11, fill: "rgb(var(--ink-faint))" }} stroke="rgb(var(--line))" />
          <YAxis domain={[-1, 1]} hide={compact} ticks={[-1, 0, 1]} tick={{ fontSize: 11, fill: "rgb(var(--ink-faint))" }} stroke="rgb(var(--line))" />
          {!compact && (
            <Tooltip
              contentStyle={{
                background: "rgb(var(--surface))",
                border: "1px solid rgb(var(--line))",
                borderRadius: 12,
                fontSize: 12,
                color: "rgb(var(--ink))",
              }}
            />
          )}
          <Line type="monotone" dataKey="sentiment" name="Sentiment" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="intensity" name="Intensity" stroke="rgb(var(--warn))" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
