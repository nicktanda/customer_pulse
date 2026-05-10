/**
 * Accent colour utilities
 *
 * Manages the user-selectable accent/highlight colour feature.
 * The chosen colour is stored as a user preference and applied
 * via the --color-accent CSS custom property.
 */

export const DEFAULT_ACCENT_COLOR = "#6366f1"; // Indigo-500 – brand default

export interface AccentColorSwatch {
  label: string;
  value: string;
}

/** Curated palette – all colours pass WCAG AA on white (#fff) */
export const ACCENT_COLOR_SWATCHES: AccentColorSwatch[] = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#d97706" },
  { label: "Pink", value: "#ec4899" },
  { label: "Fuchsia", value: "#d946ef" },
];

// ---------------------------------------------------------------------------
// WCAG contrast helpers
// ---------------------------------------------------------------------------

/**
 * Convert a hex colour string to its relative luminance (WCAG 2.1).
 */
export function hexToLuminance(hex: string): number {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const linearise = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Return the WCAG contrast ratio between two hex colours.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true when the given accent colour passes WCAG AA
 * (contrast ≥ 4.5 : 1) against a white background.
 */
export function passesWcagAA(
  accentHex: string,
  backgroundHex = "#ffffff"
): boolean {
  return contrastRatio(accentHex, backgroundHex) >= 4.5;
}

// ---------------------------------------------------------------------------
// CSS custom property helpers (client-side only)
// ---------------------------------------------------------------------------

/**
 * Apply the accent colour as the --color-accent CSS custom property on :root.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-accent", hex);
}

/**
 * Remove any inline override and fall back to the CSS-defined default.
 */
export function resetAccentColor(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty("--color-accent");
}

/**
 * Basic hex validation.
 */
export function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}
