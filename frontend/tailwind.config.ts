import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Apple system palette (light/dark values live in globals.css :root vars)
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-light": "rgb(var(--ink-light) / <alpha-value>)",
        "ink-faint": "rgb(var(--ink-faint) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        sidebar: "rgb(var(--sidebar) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        hover: "rgb(var(--hover) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        good: "rgb(var(--good) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
      },
      fontFamily: {
        // SF Pro everywhere — graceful fallbacks off-Apple platforms
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Inter", "Segoe UI", "Arial", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Helvetica Neue", "Inter", "sans-serif"],
        heavy: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Helvetica Neue", "Inter", "sans-serif"],
      },
      fontSize: {
        // Slightly larger reading sizes (iOS-style) than Tailwind defaults
        xs: ["13px", { lineHeight: "1.4" }],
        sm: ["15px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.55" }],
      },
      borderRadius: {
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "26px",
      },
      boxShadow: {
        card: "inset 0 1px 1px rgba(255,255,255,0.5), 0 1px 2px rgba(15,20,40,0.04), 0 6px 24px rgba(15,20,40,0.06)",
        pop: "0 12px 40px rgba(15,20,40,0.16)",
        glass: "inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 1px rgba(255,255,255,0.2), 0 12px 40px rgba(31,38,66,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
