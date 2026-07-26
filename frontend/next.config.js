/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const supabaseWss = SUPABASE_URL.replace(/^https/, "wss");

// connect-src is the key control for the localStorage-token-theft risk: even if
// script injection occurs, the page can only send data to these origins (its own
// backend + Supabase), not to an attacker-controlled host.
const connectSrc = ["'self'", SUPABASE_URL, supabaseWss, API_URL, isDev && "ws:"]
  .filter(Boolean)
  .join(" ");

// Next.js injects inline hydration scripts and Tailwind/styled-jsx inject inline
// styles, so 'unsafe-inline' is required without a nonce (nonces need middleware
// — a documented follow-up). Everything else is locked down.
const scriptSrc = ["'self'", "'unsafe-inline'", isDev && "'unsafe-eval'"]
  .filter(Boolean)
  .join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `script-src ${scriptSrc}`,
  `connect-src ${connectSrc}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HSTS only in production (ignored over http, but keeps dev clean).
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
