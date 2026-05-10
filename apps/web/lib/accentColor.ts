/**
 * accentColor.ts
 *
 * Utilities for the accent-colour feature:
 *  - Curated palette
 *  - Hex validation
 *  - WCAG contrast ratio calculation
 *  - CSS custom-property application
 *  - localStorage persistence
 */

export const DEFAULT_ACCENT_COLOR = "#6366f1";
export const ACCENT_LS_KEY = "accent-color";

export interface AccentColorSwatch {
  label: string;
  value: string;
}

export const ACCENT_COLOR_PALETTE: AccentColorSwatch[] = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#10b981" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Slate", value: "#64748b" },
];

/** Returns true for both 3- and 6-digit hex strings with a leading #. */
export function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

/** Expand a 3-digit hex to 6-digit, e.g. "#abc" → "#aabbcc". */
function expandHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

/** Compute relative luminance (WCAG 2.1 formula). Returns null for invalid hex. */
export function relativeLuminance(hex: string): number | null {
  if (!isValidHex(hex)) return null;
  const full = expandHex(hex);
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  const linearise = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG 2.1 contrast ratio between two colours. Returns null for invalid input. */
export function contrastRatio(
  foreground: string,
  background: string
): number | null {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns true if `hex` on white passes WCAG 2.1 AA for normal text (4.5:1). */
export function passesWcagAA(hex: string): boolean {
  const ratio = contrastRatio(hex, "#ffffff");
  return ratio !== null && ratio >= 4.5;
}

/** Returns true if `hex` on white passes WCAG 2.1 AA for large text / UI (3:1). */
export function passesWcagAALarge(hex: string): boolean {
  const ratio = contrastRatio(hex, "#ffffff");
  return ratio !== null && ratio >= 3;
}

/** Apply the accent colour as a CSS custom property on :root. */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-accent", hex);
}

/**
 * Read the persisted accent colour from localStorage.
 * Returns null on SSR or if nothing is stored.
 */
export function readStoredAccentColor(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCENT_LS_KEY);
  } catch {
    return null;
  }
}

/** Persist the accent colour to localStorage. */
export function storeAccentColor(hex: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCENT_LS_KEY, hex);
  } catch {
    // Ignore storage errors (e.g. private browsing quota exceeded)
  }
}
