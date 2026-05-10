/**
 * Accent colour utilities – palette, contrast validation, and CSS variable injection.
 */

export interface AccentColor {
  id: string;
  label: string;
  value: string; // hex
}

/** Curated palette of 10 WCAG-AA-friendly accent colours. */
export const ACCENT_PALETTE: AccentColor[] = [
  { id: "brand", label: "Brand Blue", value: "#2563EB" },
  { id: "indigo", label: "Indigo", value: "#4F46E5" },
  { id: "violet", label: "Violet", value: "#7C3AED" },
  { id: "rose", label: "Rose", value: "#E11D48" },
  { id: "orange", label: "Orange", value: "#EA580C" },
  { id: "amber", label: "Amber", value: "#B45309" },
  { id: "emerald", label: "Emerald", value: "#059669" },
  { id: "teal", label: "Teal", value: "#0D9488" },
  { id: "cyan", label: "Cyan", value: "#0284C7" },
  { id: "pink", label: "Pink", value: "#DB2777" },
];

export const DEFAULT_ACCENT_COLOR = ACCENT_PALETTE[0].value;

// ---------------------------------------------------------------------------
// Contrast helpers (WCAG 2.1)
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(hex: string, backgroundHex = "#FFFFFF"): number | null {
  const fg = hexToRgb(hex);
  const bg = hexToRgb(backgroundHex);
  if (!fg || !bg) return null;

  const L1 = relativeLuminance(...fg);
  const L2 = relativeLuminance(...bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true when the accent colour meets WCAG AA (4.5:1 for normal text)
 * against a white background.
 */
export function isWcagAA(hex: string, backgroundHex = "#FFFFFF"): boolean {
  const ratio = contrastRatio(hex, backgroundHex);
  if (ratio === null) return false;
  return ratio >= 4.5;
}

// ---------------------------------------------------------------------------
// CSS variable injection
// ---------------------------------------------------------------------------

export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-accent", hex);

  // Derive a slightly-darker shade for hover states (~15% darker).
  const darker = darkenHex(hex, 0.15);
  if (darker) {
    document.documentElement.style.setProperty("--color-accent-dark", darker);
  }

  // Derive a very-light tint for subtle backgrounds (~90% lighter).
  const light = lightenHex(hex, 0.9);
  if (light) {
    document.documentElement.style.setProperty("--color-accent-light", light);
  }
}

function darkenHex(hex: string, amount: number): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => Math.max(0, Math.round(c * (1 - amount))));
  return rgbToHex(r, g, b);
}

function lightenHex(hex: string, amount: number): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => Math.min(255, Math.round(c + (255 - c) * amount)));
  return rgbToHex(r, g, b);
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}
