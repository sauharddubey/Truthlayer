import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Notion-style palette
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
        sans: ["Inter", "ui-sans-serif", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
        display: ["Fraunces", "Georgia", "Cambria", "Times New Roman", "serif"],
        heavy: ["Anton", "Inter", "Impact", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,15,15,0.04), 0 2px 8px rgba(15,15,15,0.03)",
        pop: "0 8px 28px rgba(15,15,15,0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
