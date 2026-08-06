export const THEME_PALETTES = [
  {
    id: "slate",
    name: "Enterprise Slate",
    category: "Current Theme",
    accentColor: "#6366f1",
    darkPreview: "bg-[#1c1d1f] border-slate-700 text-indigo-400",
    lightPreview: "bg-[#f8fafc] border-slate-300 text-indigo-600",
  },
  {
    id: "mono",
    name: "Monochrome Minimal",
    category: "Black & White",
    accentColor: "#ffffff",
    darkPreview: "bg-[#121212] border-zinc-700 text-white",
    lightPreview: "bg-[#ffffff] border-zinc-300 text-black",
  },
  {
    id: "midnight",
    name: "Midnight Cyber",
    category: "Deep Sapphire",
    accentColor: "#06a8c5ff",
    darkPreview: "bg-[#0f172a] border-cyan-800 text-cyan-400",
    lightPreview: "bg-[#f0f9ff] border-cyan-200 text-cyan-700",
  },
  {
    id: "emerald",
    name: "Emerald Forest",
    category: "Charcoal & Mint",
    accentColor: "#10b981",
    darkPreview: "bg-[#141f19] border-emerald-800 text-emerald-400",
    lightPreview: "bg-[#f0fdf4] border-emerald-200 text-emerald-700",
  },
  {
    id: "violet",
    name: "Royal Amethyst",
    category: "Deep Purple",
    accentColor: "#a855f7",
    darkPreview: "bg-[#19142b] border-purple-800 text-purple-400",
    lightPreview: "bg-[#faf5ff] border-purple-200 text-purple-700",
  },
  {
    id: "amber",
    name: "Warm Amber",
    category: "Espresso & Gold",
    accentColor: "#f59e0b",
    darkPreview: "bg-[#1f1914] border-amber-800 text-amber-400",
    lightPreview: "bg-[#fffbeb] border-amber-200 text-amber-700",
  },
];

export const THEME_MODES = [
  { id: "dark", name: "Dark Mode", label: "Recommended for low light" },
  { id: "light", name: "Light Mode", label: "Clean bright interface" },
];

export const BRAND_COLORS = {
  accent: "var(--accent-main)",
  accentSoft: "var(--accent-soft)",
  danger: "var(--danger-main, #f43f5e)",
  dangerSoft: "var(--danger-soft, rgba(244, 63, 94, 0.12))",
  dangerHover: "var(--danger-hover, rgba(244, 63, 94, 0.22))",
  dangerText: "var(--danger-text, #fb7185)",
  success: "#10b981",
  warning: "#f59e0b",
};
