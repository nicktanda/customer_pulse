/**
 * Shared colour utility functions.
 * Kept pure (no DOM/browser APIs) so they can be used in both
 * client components and unit tests.
 */

/** Validates a 6-digit hex colour string. */
export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

/**
 * Calculate relative luminance for a hex colour.
 * Assumes a valid 6-digit hex string.
 */
export function hexToLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const linearise = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Calculate WCAG contrast ratio between two hex colours.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG AA compliance (≥ 4.5:1) against a given background colour.
 * Pass `"#1a1a2e"` (or similar) for dark-mode checks.
 */
export function meetsWcagAA(
  hex: string,
  background: string = "#ffffff"
): boolean {
  if (!isValidHex(hex) || !isValidHex(background)) return false;
  return contrastRatio(hex, background) >= 4.5;
}
