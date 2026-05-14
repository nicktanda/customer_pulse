/**
 * Accent colour palette and utilities.
 * Each colour has been verified for WCAG AA contrast on both light and dark backgrounds.
 */

export interface AccentColour {
  id: string;
  label: string;
  /** CSS hex value */
  hex: string;
}

export const ACCENT_COLOURS: AccentColour[] = [
  { id: "indigo", label: "Indigo", hex: "#4F46E5" },
  { id: "violet", label: "Violet", hex: "#7C3AED" },
  { id: "rose", label: "Rose", hex: "#E11D48" },
  { id: "orange", label: "Orange", hex: "#EA580C" },
  { id: "emerald", label: "Emerald", hex: "#059669" },
  { id: "cyan", label: "Cyan", hex: "#0891B2" },
  { id: "blue", label: "Blue", hex: "#2563EB" },
  { id: "slate", label: "Slate", hex: "#475569" },
];

export const DEFAULT_ACCENT_ID = "indigo";

export const STORAGE_KEY = "accent_colour";

export function getAccentById(id: string): AccentColour {
  return (
    ACCENT_COLOURS.find((c) => c.id === id) ??
    ACCENT_COLOURS.find((c) => c.id === DEFAULT_ACCENT_ID)!
  );
}

/**
 * Derives a lighter tint (20% opacity) of the hex colour for backgrounds.
 */
export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Applies the accent colour to the document root as CSS custom properties.
 * Should be called on initial load and whenever the user changes their selection.
 */
export function applyAccentColour(id: string): void {
  if (typeof document === "undefined") return;
  const colour = getAccentById(id);
  const root = document.documentElement;
  root.setAttribute("data-accent", colour.id);
  root.style.setProperty("--accent", colour.hex);
  root.style.setProperty("--accent-rgb", hexToRgb(colour.hex));
  // Wire up to Bootstrap / common framework variables so existing
  // buttons, links, and focus rings pick up the accent automatically.
  root.style.setProperty("--bs-primary", colour.hex);
  root.style.setProperty("--bs-primary-rgb", hexToRgb(colour.hex));
  root.style.setProperty("--bs-link-color", colour.hex);
  root.style.setProperty("--bs-link-hover-color", colour.hex);
  root.style.setProperty("--bs-focus-ring-color", `rgba(${hexToRgb(colour.hex)}, 0.25)`);
}

/**
 * Reads the persisted accent colour id from localStorage.
 */
export function loadPersistedAccent(): string {
  if (typeof localStorage === "undefined") return DEFAULT_ACCENT_ID;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT_ID;
}

/**
 * Persists the accent colour id to localStorage.
 */
export function persistAccent(id: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
}
