/**
 * Lightweight stroke-icon set (Lucide-style). No emojis anywhere in the app —
 * every glyph is one of these crisp, currentColor SVGs.
 */
type P = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const ArrowRight = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowUpRight = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const ChevronDown = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const LogOut = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const ShieldCheck = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M12 3 5 6v6c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const ScanLine = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" />
  </svg>
);

export const AudioLines = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h-2" />
  </svg>
);

export const Scale = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7h6l-3-7ZM19 7l-3 7h6l-3-7Z" />
  </svg>
);

export const Eye = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const Sparkle = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

export const FileSearch = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6M14 3l5 5M14 3v5h5" />
    <circle cx="15.5" cy="14.5" r="2.5" />
    <path d="m18 17 2 2" />
  </svg>
);

export const AlertTriangle = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M10.3 4 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const Check = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="m5 12 5 5 9-11" />
  </svg>
);

export const Play = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="1em" height="1em">
    <path d="M8 5v14l11-7L8 5Z" />
  </svg>
);

export const Layers = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" />
  </svg>
);

export const Network = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="5" cy="19" r="2.5" />
    <circle cx="19" cy="19" r="2.5" />
    <path d="M12 7.5 6.5 17M12 7.5 17.5 17" />
  </svg>
);

export const Settings = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const Home = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
  </svg>
);

export const Box = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8" />
  </svg>
);

export const Plus = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Upload = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 9l5-5 5 5M12 4v12" />
  </svg>
);

export const Link2 = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
  </svg>
);

export const CornerDownRight = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M4 4v7a2 2 0 0 0 2 2h14M15 8l5 5-5 5" />
  </svg>
);

export const Sun = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

export const Moon = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export const HelpCircle = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
);

export const Lock = ({ className }: P) => (
  <svg {...base} className={className} width="1em" height="1em">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

