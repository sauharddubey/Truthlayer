/** Display helpers for analysis/dashboard score metrics (one decimal, dot separator). */

export function metricValue(value?: number | null): number | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value) * 10) / 10;
}

export function formatMetric(value?: number | null, fallback = "—"): string {
  const n = metricValue(value);
  return n == null ? fallback : n.toFixed(1);
}

export function formatMetricNa(value?: number | null): string {
  return formatMetric(value, "N/A");
}

export function formatMetricPercent(value?: number | null, fallback = "—"): string {
  const n = metricValue(value);
  return n == null ? fallback : `${n.toFixed(1)}%`;
}

/** Format a 0..1 unit value as a percentage with one decimal. */
export function formatUnitPercent(value?: number | null, fallback = "—"): string {
  if (value == null || Number.isNaN(Number(value))) return fallback;
  return formatMetricPercent(Number(value) * 100);
}

/** Sentiment scores stored on -1..1 are shown on a 0..100 scale. */
export function formatSentimentDisplay(score?: number | null, fallback = "—"): string {
  if (score == null || Number.isNaN(Number(score))) return fallback;
  return formatMetric((Number(score) + 1) * 50);
}

export function formatStatDisplay(value: unknown, isCount = false): string | number {
  if (value == null) return "—";
  if (isCount || typeof value !== "number") return value as string | number;
  return formatMetric(value);
}
