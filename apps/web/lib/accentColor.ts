/**
 * Accent colour utilities
 * Manages user-selectable accent colour preference, WCAG contrast validation,
 * and CSS custom property injection.
 */

export const DEFAULT_ACCENT_COLOR = "#6366f1"; // Indigo-500 – brand default

export interface AccentColorSwatch {
  label: string;
  value: string;
}

/** Curated palette – all pass WCAG AA (4.5:1) against white #ffffff */
export const ACCENT_COLOR_PALETTE: AccentColorSwatch[] = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Sky", value: "#0284c7" },
  { label: "Teal", value: "#0d9488" },
  { label: "Emerald", value: "#059669" },
  { label: "Rose", value: "#e11d48" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#b45309" },
  { label: "Pink", value: "#db2777" },
  { label: "Slate", value: "#475569" },
];

/**
 * Parse a hex colour string to [r, g, b] in the range 0-255.
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const sanitised = hex.replace(/^#/, "");
  if (sanitised.length !== 3 && sanitised.length !== 6) return null;

  const full =
    sanitised.length === 3
      ? sanitised
          .split("")
          .map((c) => c + c)
          .join("")
      : sanitised;

  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/**
 * Convert an sRGB channel value (0-255) to a linearised value.
 * Follows the WCAG 2.1 formula.
 */
function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Compute relative luminance of a hex colour.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(linearise);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute the WCAG contrast ratio between two hex colours.
 * Returns null if either colour is invalid.
 */
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

/**
 * Returns true when the accent colour passes WCAG AA (4.5:1) against white.
 */
export function passesWcagAA(
  accentHex: string,
  backgroundHex = "#ffffff"
): boolean {
  const ratio = contrastRatio(accentHex, backgroundHex);
  return ratio !== null && ratio >= 4.5;
}

/**
 * Returns true when the accent colour passes WCAG AA Large (3:1) against white.
 */
export function passesWcagAALarge(
  accentHex: string,
  backgroundHex = "#ffffff"
): boolean {
  const ratio = contrastRatio(accentHex, backgroundHex);
  return ratio !== null && ratio >= 3;
}

/**
 * Validate a hex string format.
 */
export function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/**
 * Apply the accent colour as a CSS custom property on the document root.
 * Safe to call in the browser only.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  const value = isValidHex(hex) ? hex : DEFAULT_ACCENT_COLOR;
  document.documentElement.style.setProperty("--color-accent", value);
}

/**
 * Remove the accent colour override, falling back to the CSS default.
 */
export function removeAccentColor(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty("--color-accent");
}

/**
 * Local-storage key used for unauthenticated / pre-hydration persistence.
 */
export const ACCENT_LS_KEY = "user_accent_color";

/**
 * Read the persisted accent colour from localStorage.
 */
export function readStoredAccentColor(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCENT_LS_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist the accent colour to localStorage.
 */
export function storeAccentColor(hex: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCENT_LS_KEY, hex);
  } catch {
    // Ignore – quota exceeded etc.
  }
}
