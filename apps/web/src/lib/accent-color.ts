/**
 * Accent colour utilities shared between client components and server actions.
 *
 * All colour values are 6-digit hex strings (e.g. '#6366f1').
 */

/** Feature flag name for the accent colour picker. */
export const ACCENT_COLOR_FEATURE_FLAG = 'NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER';

/** Default accent colour (Indigo-500). */
export const DEFAULT_ACCENT_COLOR = '#6366f1';

/**
 * Curated palette of accessible-ish accent colours.
 * Each entry has a display label and a hex value.
 */
export const ACCENT_COLOR_PALETTE: { label: string; value: string }[] = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Sky', value: '#0ea5e9' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Slate', value: '#475569' },
];

/**
 * Returns `true` if `hex` is a valid 6-digit CSS hex colour string
 * (e.g. `#6366f1`). Rejects shorthand (#rgb), alpha (#rrggbbaa), and
 * non-hex characters.
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

/**
 * Parses a valid 6-digit hex colour into its RGB components.
 * Returns `null` for invalid input.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHex(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Guard against NaN (should not occur after isValidHex, but defensive).
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * Computes the WCAG 2.1 relative luminance of a hex colour.
 * Returns `null` for invalid input.
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const linearise = (c: number): number => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * linearise(rgb.r) +
    0.7152 * linearise(rgb.g) +
    0.0722 * linearise(rgb.b)
  );
}

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colours.
 * Returns `null` if either colour is invalid.
 *
 * The ratio is always ≥ 1 (lighter / darker + 0.05 convention).
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
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
 * Returns `true` if the accent colour passes WCAG AA for normal text
 * (contrast ratio ≥ 4.5:1) against a white (#ffffff) background.
 */
export function passesWcagAA(hex: string): boolean {
  const ratio = contrastRatio(hex, '#ffffff');
  if (ratio === null) return false;
  return ratio >= 4.5;
}
