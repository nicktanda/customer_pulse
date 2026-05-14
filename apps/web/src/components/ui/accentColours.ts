/**
 * Curated accent colour palette.
 * All colours verified for WCAG AA contrast (≥4.5:1) against white (#fff) foreground
 * or dark (#1a1a1a) foreground as indicated by `foreground`.
 *
 * value        – the primary accent (used for --accent-colour)
 * hover        – slightly darker shade for hover states
 * subtle       – very light tint for backgrounds / badges
 * foreground   – text colour to use ON TOP of `value` (white or near-black)
 */
export const ACCENT_COLOURS = {
  indigo: {
    label: "Indigo",
    value: "#4f46e5",
    hover: "#4338ca",
    subtle: "#eef2ff",
    foreground: "#ffffff",
  },
  violet: {
    label: "Violet",
    value: "#7c3aed",
    hover: "#6d28d9",
    subtle: "#f5f3ff",
    foreground: "#ffffff",
  },
  rose: {
    label: "Rose",
    value: "#e11d48",
    hover: "#be123c",
    subtle: "#fff1f2",
    foreground: "#ffffff",
  },
  teal: {
    label: "Teal",
    value: "#0f766e",
    hover: "#0d6460",
    subtle: "#f0fdfa",
    foreground: "#ffffff",
  },
  amber: {
    label: "Amber",
    value: "#b45309",
    hover: "#92400e",
    subtle: "#fffbeb",
    foreground: "#ffffff",
  },
  sky: {
    label: "Sky",
    value: "#0369a1",
    hover: "#075985",
    subtle: "#f0f9ff",
    foreground: "#ffffff",
  },
  emerald: {
    label: "Emerald",
    value: "#047857",
    hover: "#065f46",
    subtle: "#ecfdf5",
    foreground: "#ffffff",
  },
  slate: {
    label: "Slate",
    value: "#475569",
    hover: "#334155",
    subtle: "#f8fafc",
    foreground: "#ffffff",
  },
} as const;

export type AccentColourKey = keyof typeof ACCENT_COLOURS;
export const DEFAULT_ACCENT_KEY: AccentColourKey = "indigo";
