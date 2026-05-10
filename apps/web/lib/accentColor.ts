/**
 * Accent colour utilities
 * Manages the user-selectable accent/highlight colour feature.
 */

export const DEFAULT_ACCENT_COLOR = "#6366f1"; // Indigo-500 – brand default

/**
 * Shared localStorage key for the persisted accent colour.
 * Exported so that all consumers reference a single source of truth.
 */
export const ACCENT_COLOR_STORAGE_KEY = "user_accent_color";

export interface AccentColorSwatch {
  name: string;
  value: string;
}

/**
 * Curated palette of accessible accent colours.
 *
 * Note: not all swatches meet WCAG AA (4.5:1) against white when used as
 * foreground text — Cyan, Emerald, Orange, Amber and Pink are intended
 * primarily as background/highlight accents. The UI will display a contrast
 * warning for any colour that fails the 4.5:1 threshold.
 */
export const ACCENT_COLOR_SWATCHES: AccentColorSwatch[] = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Pink", value: "#ec4899" },
];

/**
 * Parse a hex colour string into its relative luminance (0–1).
 * Uses the WCAG 2.1 formula.
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculate the WCAG contrast ratio between two hex colours.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true when the colour meets WCAG AA (4.5:1) against white.
 * Most UI text / icon uses are on a light background.
 */
export function meetsWcagAA(hex: string): boolean {
  return contrastRatio(hex, "#ffffff") >= 4.5;
}

/**
 * Apply the accent colour as a CSS custom property on :root.
 * Safe to call client-side only.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-accent", hex);
  // Derive a slightly-darker "pressed" shade for active states.
  // Note: darkenHex uses a simple per-channel subtraction which is
  // perceptually naive — near-black colours will clamp to #000. Acceptable
  // for v1; a proper HSL-based approach would be more consistent.
  document.documentElement.style.setProperty(
    "--color-accent-dark",
    darkenHex(hex, 15)
  );
}

/**
 * Darken a hex colour by `amount` (0-255 per channel).
 *
 * ⚠️  Perceptually naive: subtracts a fixed value from each RGB channel.
 * Near-black inputs will clamp to #000000. Suitable for v1 hover states.
 */
function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(clean.substring(0, 2), 16) - amount);
  const g = clamp(parseInt(clean.substring(2, 4), 16) - amount);
  const b = clamp(parseInt(clean.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Validate that a string is a well-formed 6-digit hex colour.
 */
export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
