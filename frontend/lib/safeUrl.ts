/**
 * Return `url` only if it uses a safe (http/https) scheme, otherwise null.
 *
 * Evidence and source links can originate from model output or ingested video
 * metadata, and React does not block `javascript:` (or `data:`) hrefs — so a
 * crafted link would be click-to-execute XSS. Callers render the link only when
 * this returns a value, and fall back to plain text otherwise.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const base =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  try {
    const parsed = new URL(url, base);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
