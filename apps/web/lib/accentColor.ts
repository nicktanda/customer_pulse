/**
 * Accent colour utilities
 * Handles palette, contrast validation, and CSS variable injection
 */

export interface AccentColor {
  id: string;
  label: string;
  value: string; // hex
}

export const ACCENT_PALETTE: AccentColor[] = [
  { id: "indigo", label: "Indigo", value: "#4F46E5" },
  { id: "violet", label: "Violet", value: "#7C3AED" },
  { id: "sky", label: "Sky", value: "#0284C7" },
  { id: "teal", label: "Teal", value: "#0D9488" },
  { id: "emerald", label: "Emerald", value: "#059669" },
  { id: "rose", label: "Rose", value: "#E11D48" },
  { id: "orange", label: "Orange", value: "#EA580C" },
  { id: "amber", label: "Amber", value: "#D97706" },
  { id: "pink", label: "Pink", value: "#DB2777" },
  { id: "slate", label: "Slate", value: "#475569" },
];

export const DEFAULT_ACCENT_COLOR = ACCENT_PALETTE[0].value;

/**
 * Shared localStorage key for the user's accent colour preference.
 * Used by both AccentColorProvider and useAccentColor to stay in sync.
 */
export const ACCENT_STORAGE_KEY = "user_accent_color";

/**
 * Parse a hex colour string into RGB components.
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const sanitised = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(sanitised)) return null;
  const int = parseInt(sanitised, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

/**
 * Relative luminance per WCAG 2.1 formula.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Contrast ratio between two hex colours.
 * Returns a number in the range [1, 21].
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 1;
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the accent colour meets WCAG AA (4.5:1) against white.
 * Most UI elements render on a white / near-white background.
 *
 * TODO: dark-mode backgrounds are not checked here. Colours like #0284C7 (sky)
 * or #D97706 (amber) may fail on dark surfaces. A future improvement should
 * accept a background colour parameter.
 */
export function meetsWcagAA(accentHex: string): boolean {
  return contrastRatio(accentHex, "#FFFFFF") >= 4.5;
}

/**
 * Inject (or update) the --color-accent CSS custom property on :root.
 * Validates the hex string before applying; silently ignores invalid input.
 * Safe to call in browser-only contexts.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  if (!isValidHex(hex)) return;
  document.documentElement.style.setProperty("--color-accent", hex);

  // Derive a slightly darker shade for hover states
  const rgb = hexToRgb(hex);
  if (rgb) {
    const darken = (c: number) => Math.max(0, Math.round(c * 0.85));
    const hoverHex = `#${[darken(rgb.r), darken(rgb.g), darken(rgb.b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")}`;
    document.documentElement.style.setProperty(
      "--color-accent-hover",
      hoverHex
    );
  }
}

/**
 * Validate a raw string as an acceptable hex colour.
 * Only accepts the full 6-digit #RRGGBB format.
 * Note: 3-digit shorthand (#RGB) is intentionally rejected for simplicity.
 */
export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
