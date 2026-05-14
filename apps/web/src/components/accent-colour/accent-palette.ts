export const ACCENT_PALETTE = [
  { key: "indigo",  label: "Indigo (default)", value: "#4f46e5" },
  { key: "violet",  label: "Violet",           value: "#7c3aed" },
  { key: "sky",     label: "Sky",              value: "#0284c7" },
  { key: "teal",    label: "Teal",             value: "#0d9488" },
  { key: "emerald", label: "Emerald",          value: "#059669" },
  { key: "amber",   label: "Amber",            value: "#d97706" },
  { key: "rose",    label: "Rose",             value: "#e11d48" },
  { key: "slate",   label: "Slate",            value: "#475569" },
] as const;

export type AccentColourKey = typeof ACCENT_PALETTE[number]["key"];

export const DEFAULT_ACCENT: AccentColourKey = "indigo";

export const ACCENT_VALUES: Record<AccentColourKey, string> = Object.fromEntries(
  ACCENT_PALETTE.map((e) => [e.key, e.value])
) as Record<AccentColourKey, string>;
