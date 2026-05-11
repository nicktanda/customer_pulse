/**
 * Accent colour utilities: palette definition, contrast checking, and feature flag.
 */

export const ACCENT_COLOR_FEATURE_FLAG = 'accent_color_picker';

export const DEFAULT_ACCENT_COLOR = '#6366f1'; // indigo-500

export interface AccentColorSwatch {
  label: string;
  value: string;
}

/**
 * Curated palette of 10 accent colours.
 *
 * NOTE: Not all swatches meet WCAG AA (4.5:1) contrast against white (#ffffff)
 * when used as text — for example, Indigo (#6366f1) has ~3.0:1. The in-picker
 * WCAG warning will alert users to low-contrast choices at selection time.
 * These colours are intended for UI highlights, borders, and interactive
 * affordances, not necessarily for body text on white backgrounds.
 */
export const ACCENT_COLOR_PALETTE: AccentColorSwatch[] = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Sky', value: '#0284c7' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Slate', value: '#475569' },
  { label: 'Orange', value: '#ea580c' },
];

/**
 * Validate that a string is a 6-digit hex colour (e.g. #rrggbb).
 * Short-form (#rgb) and alpha (#rrggbbaa) are intentionally unsupported.
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

/**
 * Parse a hex colour string into its RGB components.
 * Returns null if the string is not a valid 6-digit hex colour.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  // Validate both length AND that all characters are valid hex digits,
  // preventing NaN propagation for strings like 'zzzzzz'.
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert an sRGB channel value (0-255) to linear light.
 */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Calculate the relative luminance of a hex colour (WCAG 2.1).
 * Returns null if the hex string is invalid.
 */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate the WCAG 2.1 contrast ratio between two hex colours.
 * Returns null if either colour is invalid.
 */
export function contrastRatio(hex1: string, hex2: string): number | null {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the given hex colour passes WCAG AA (4.5:1) contrast
 * against white (#ffffff).
 */
export function passesWcagAA(hex: string): boolean {
  const ratio = contrastRatio(hex, '#ffffff');
  if (ratio === null) return false;
  return ratio >= 4.5;
}
