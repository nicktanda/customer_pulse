/**
 * Accent colour utilities: palette, contrast checking, CSS injection.
 */

export const DEFAULT_ACCENT = '#6366f1';

export const ACCENT_PALETTE: { label: string; value: string }[] = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Sky', value: '#0284c7' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Fuchsia', value: '#a21caf' },
  { label: 'Orange', value: '#ea580c' },
];

/**
 * Parse a hex colour into [r, g, b] 0-255.
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Relative luminance per WCAG 2.1.
 */
function luminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Contrast ratio between two hex colours.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;
  const l1 = luminance(...rgb1);
  const l2 = luminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true when the accent passes WCAG AA (4.5:1) against white.
 * Most UI uses white/light backgrounds so we test against #ffffff.
 */
export function passesWCAG_AA(accent: string, background = '#ffffff'): boolean {
  return contrastRatio(accent, background) >= 4.5;
}

/**
 * Derive a readable foreground colour (white or near-black) for the accent.
 */
export function accentForeground(accent: string): string {
  const rgb = hexToRgb(accent);
  if (!rgb) return '#000000';
  const l = luminance(...rgb);
  return l > 0.179 ? '#111827' : '#ffffff';
}

/**
 * Inject the accent CSS custom property into :root.
 * Safe to call in browser-only contexts.
 */
export function applyAccentToDom(accent: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--color-accent', accent);
  root.style.setProperty('--color-accent-fg', accentForeground(accent));
}

/**
 * Validate hex format.
 */
export function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}
