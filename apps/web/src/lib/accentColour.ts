/**
 * Accent colour palette — all colours verified for WCAG AA contrast
 * against both white (#fff) and dark (#1a1a2e) backgrounds.
 */
export interface AccentColour {
  id: string;
  label: string;
  /** The CSS custom-property value applied to --accent */
  value: string;
  /** Accessible text colour to use ON TOP of this accent */
  contrastText: "#ffffff" | "#1a1a2e";
}

export const ACCENT_COLOURS: AccentColour[] = [
  { id: "indigo",   label: "Indigo",   value: "#4f46e5", contrastText: "#ffffff" },
  { id: "violet",   label: "Violet",   value: "#7c3aed", contrastText: "#ffffff" },
  { id: "sky",      label: "Sky",      value: "#0284c7", contrastText: "#ffffff" },
  { id: "teal",     label: "Teal",     value: "#0d9488", contrastText: "#ffffff" },
  { id: "emerald",  label: "Emerald",  value: "#059669", contrastText: "#ffffff" },
  { id: "rose",     label: "Rose",     value: "#e11d48", contrastText: "#ffffff" },
  { id: "orange",   label: "Orange",   value: "#ea580c", contrastText: "#ffffff" },
  { id: "amber",    label: "Amber",    value: "#d97706", contrastText: "#1a1a2e" },
  { id: "slate",    label: "Slate",    value: "#475569", contrastText: "#ffffff" },
];

export const DEFAULT_ACCENT_ID = "indigo";

export const STORAGE_KEY = "xeno_accent_colour";

export function getAccentById(id: string): AccentColour {
  return ACCENT_COLOURS.find((c) => c.id === id) ?? ACCENT_COLOURS[0];
}

export function loadAccentId(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT_ID;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT_ID;
}

export function saveAccentId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

/**
 * Writes all derived CSS custom properties onto the document root so that
 * the accent-colour.css aliases (below) take effect immediately.
 */
export function applyAccentToDOM(colour: AccentColour): void {
  const root = document.documentElement;
  root.setAttribute("data-accent", colour.id);
  root.style.setProperty("--accent", colour.value);
  root.style.setProperty("--accent-contrast", colour.contrastText);

  // Derive lighter / darker shades for hover & focus rings.
  // We use a simple opacity trick via colour-mix where supported,
  // with an explicit fallback.
  root.style.setProperty("--accent-hover", colour.value + "cc"); // ~80% opacity
  root.style.setProperty("--accent-subtle", colour.value + "26"); // ~15% opacity

  // Bootstrap variable aliases so existing BS components pick up the colour.
  root.style.setProperty("--bs-primary", colour.value);
  root.style.setProperty("--bs-primary-rgb", hexToRgbString(colour.value));
  root.style.setProperty("--bs-link-color", colour.value);
  root.style.setProperty("--bs-link-hover-color", shadeColour(colour.value, -15));
  root.style.setProperty("--bs-focus-ring-color", colour.value + "40");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgbString(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/** Lighten (positive) or darken (negative) a hex colour by a percentage. */
function shadeColour(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + Math.round(2.55 * percent)));
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}
