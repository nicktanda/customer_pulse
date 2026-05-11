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
 * Curated palette of 10 accessible accent colour swatches.
 * All values are valid 6-digit hex strings.
 */
export const ACCENT_COLOR_PALETTE: AccentColorSwatch[] = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Slate', value: '#475569' },
];

/**
 * Returns true if `hex` is a valid 6-digit hex colour string (e.g. `#rrggbb`).
 * Short-form (#rgb) and alpha (#rrggbbaa) are intentionally unsupported.
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Converts a hex channel value (00–ff) to a linear RGB component.
 */
function linearise(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Computes the WCAG relative luminance of a hex colour.
 * Returns `null` if the hex string is invalid.
 */
export function relativeLuminance(hex: string): number | null {
  if (!isValidHex(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Guard against NaN (should not happen after isValidHex, but be safe).
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Computes the WCAG contrast ratio between two hex colours.
 * Returns `null` if either colour is invalid.
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
 * Returns true if the hex colour passes WCAG AA contrast (4.5:1) against white.
 * Returns false for invalid hex strings.
 */
export function passesWcagAA(hex: string): boolean {
  const ratio = contrastRatio(hex, '#ffffff');
  if (ratio === null) return false;
  return ratio >= 4.5;
}
