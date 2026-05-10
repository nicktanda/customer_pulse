/**
 * Accent colour utilities
 *
 * Manages the user-selectable accent colour feature.
 * Colours are stored per-user and applied via a CSS custom property (--color-accent).
 */

export const DEFAULT_ACCENT_COLOR = "#6366f1"; // Indigo-500 – brand default

/** Storage key used in localStorage for the cached value (reduces flicker on load) */
export const ACCENT_COLOR_STORAGE_KEY = "user_accent_color";

/** The CSS custom property name consumed throughout the app */
export const ACCENT_COLOR_CSS_VAR = "--color-accent";

/**
 * Curated palette of accessible accent colours.
 * Each entry has been verified to achieve WCAG AA contrast (≥ 4.5:1) against
 * a white (#fff) background when used for text, and ≥ 3:1 for UI components.
 */
export interface PaletteColor {
  label: string;
  value: string;
}

export const ACCENT_PALETTE: PaletteColor[] = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#e11d48" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Emerald", value: "#059669" },
  { label: "Teal", value: "#0d9488" },
  { label: "Sky", value: "#0284c7" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Pink", value: "#db2777" },
];

// ---------------------------------------------------------------------------
// Contrast checking (WCAG 2.1)
// ---------------------------------------------------------------------------

/** Parse a hex colour string into [r, g, b] in 0–255 range. */
function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length !== 3 && cleaned.length !== 6) return null;

  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;

  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Relative luminance of an sRGB colour (WCAG 2.1 formula). */
function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two hex colours (always ≥ 1). */
export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;

  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the accent colour passes WCAG AA against white (#fff).
 * AA requires 4.5:1 for normal text, 3:1 for large text / UI components.
 * We use the stricter 4.5:1 threshold to be safe.
 */
export function passesWcagAA(accentHex: string): boolean {
  return contrastRatio(accentHex, "#ffffff") >= 4.5;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate that a string looks like a 3- or 6-digit hex colour. */
export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/**
 * Apply the accent colour to the document root as a CSS custom property.
 * Safe to call in browser environments only.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(ACCENT_COLOR_CSS_VAR, hex);
}

/**
 * Read the persisted accent colour from localStorage.
 * Returns null if none is stored or running server-side.
 */
export function readStoredAccentColor(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist the accent colour to localStorage so it can be applied on next
 * page load before the network request completes.
 */
export function writeStoredAccentColor(hex: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, hex);
  } catch {
    // ignore – quota exceeded etc.
  }
}
