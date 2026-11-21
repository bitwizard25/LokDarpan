// Design-sync only: the app's Tailwind config + a safelist so the shipped stylesheet carries the full
// design-system vocabulary (not just classes the app happens to use today).
import base from "../tailwind.config";
import type { Config } from "tailwindcss";

export default {
  ...base,
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    "glass-panel", "nav-pill", "lok-card", "input-minimal", "btn-primary", "btn-secondary", "btn-ghost",
    "text-gradient", "spotlight-bg", "scrollbar-hide", "bg-spotlight", "bg-glass-gradient", "bg-border-gradient",
    "shadow-minimal", "shadow-minimal-hover", "shadow-glow-subtle", "shadow-glow-white", "font-display", "font-sans",
    { pattern: /^(bg|text|border|ring|from|to|via|placeholder)-(dark|primary|accent)-(50|100|200|300|400|500|600|700|800|900|950|1000|glow)$/ },
    { pattern: /^animate-(fade-in|slide-up|shimmer|bounce-elastic)$/ },
  ],
} satisfies Config;
