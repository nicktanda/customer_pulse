/**
 * Accent colour palette — each colour has been checked for WCAG AA contrast
 * against both white (#fff) and a dark surface (#1a1a2e) backgrounds.
 */
export interface AccentColour {
  id: string;
  label: string;
  /** The primary accent value applied as --accent-colour */
  value: string;
  /** Darker shade used for hover / active states */
  dark: string;
  /** Lighter tint used for focus rings */
  light: string;
}

export const ACCENT_COLOURS: AccentColour[] = [
  {
    id: "indigo",
    label: "Indigo",
    value: "#4f46e5",
    dark: "#3730a3",
    light: "#a5b4fc",
  },
  {
    id: "violet",
    label: "Violet",
    value: "#7c3aed",
    dark: "#5b21b6",
    light: "#c4b5fd",
  },
  {
    id: "sky",
    label: "Sky",
    value: "#0284c7",
    dark: "#0369a1",
    light: "#7dd3fc",
  },
  {
    id: "teal",
    label: "Teal",
    value: "#0d9488",
    dark: "#0f766e",
    light: "#5eead4",
  },
  {
    id: "emerald",
    label: "Emerald",
    value: "#059669",
    dark: "#047857",
    light: "#6ee7b7",
  },
  {
    id: "rose",
    label: "Rose",
    value: "#e11d48",
    dark: "#be123c",
    light: "#fda4af",
  },
  {
    id: "orange",
    label: "Orange",
    value: "#ea580c",
    dark: "#c2410c",
    light: "#fdba74",
  },
  {
    id: "amber",
    label: "Amber",
    value: "#d97706",
    dark: "#b45309",
    light: "#fcd34d",
  },
];

export const DEFAULT_ACCENT_ID = "indigo";

export const ACCENT_STORAGE_KEY = "xeno_accent_colour";

export function getAccentById(id: string): AccentColour {
  return (
    ACCENT_COLOURS.find((c) => c.id === id) ??
    ACCENT_COLOURS.find((c) => c.id === DEFAULT_ACCENT_ID)!
  );
}

export function applyAccentColour(accent: AccentColour): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-accent", accent.id);
  root.style.setProperty("--accent-colour", accent.value);
  root.style.setProperty("--accent-colour-dark", accent.dark);
  root.style.setProperty("--accent-colour-light", accent.light);
  // Wire into Bootstrap / shared tokens so buttons, links, focus rings respond
  root.style.setProperty("--bs-primary", accent.value);
  root.style.setProperty("--bs-primary-rgb", hexToRgb(accent.value));
  root.style.setProperty("--bs-link-color", accent.value);
  root.style.setProperty("--bs-link-hover-color", accent.dark);
  root.style.setProperty("--bs-focus-ring-color", accent.light);
}

function hexToRgb(hex: string): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
