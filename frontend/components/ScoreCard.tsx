"use client";

function tone(value: number | null, invert = false) {
  if (value == null) return "text-ink-faint";
  const v = invert ? 100 - value : value;
  if (v >= 70) return "text-good";
  if (v >= 40) return "text-warn";
  return "text-bad";
}

export function ScoreCard({
  label,
  value,
  suffix = "/100",
  invert = false,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
  invert?: boolean;
  hint?: string;
}) {
  const v = value == null ? null : Math.round(value);
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="text-xs font-medium text-ink-light">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone(v, invert)}`}>
        {v == null ? "—" : v}
        {v != null && <span className="text-sm font-normal text-ink-faint">{suffix}</span>}
      </div>
      {hint && <div className="mt-0.5 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}
