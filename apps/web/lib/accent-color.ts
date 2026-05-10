/**
 * Accent colour utilities
 * Handles palette definitions, contrast checking, and CSS variable application.
 */

export interface AccentColor {
  id: string;
  label: string;
  value: string; // hex
}

/** Curated palette of 10 accessible accent colours */
export const ACCENT_PALETTE: AccentColor[] = [
  { id: "indigo", label: "Indigo", value: "#4F46E5" },
  { id: "violet", label: "Violet", value: "#7C3AED" },
  { id: "sky", label: "Sky", value: "#0284C7" },
  { id: "teal", label: "Teal", value: "#0D9488" },
  { id: "emerald", label: "Emerald", value: "#059669" },
  { id: "amber", label: "Amber", value: "#D97706" },
  { id: "rose", label: "Rose", value: "#E11D48" },
  { id: "pink", label: "Pink", value: "#DB2777" },
  { id: "orange", label: "Orange", value: "#EA580C" },
  { id: "slate", label: "Slate", value: "#475569" },
];

export const DEFAULT_ACCENT_COLOR = ACCENT_PALETTE[0].value; // Indigo

/** Parse a hex colour string into its RGB components (0–255). */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

/** Calculate relative luminance per WCAG 2.1 formula. */
function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Compute the WCAG contrast ratio between two hex colours.
 * Returns a value between 1 and 21.
 */
export function contrastRatio(hex1: string, hex2: string): number | null {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return null;

  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG AA compliance (4.5:1 for normal text, 3:1 for large/UI).
 * We use the stricter 4.5:1 by default.
 */
export function meetsWcagAA(
  accentHex: string,
  backgroundHex = "#FFFFFF",
  threshold = 4.5
): boolean {
  const ratio = contrastRatio(accentHex, backgroundHex);
  if (ratio === null) return false;
  return ratio >= threshold;
}

/**
 * Apply the accent colour as a CSS custom property on the document root.
 * Also derives a lighter tint for hover states and a dark variant.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  const rgb = hexToRgb(hex);
  if (!rgb) return;

  const root = document.documentElement;
  root.style.setProperty("--color-accent", hex);
  root.style.setProperty(
    "--color-accent-rgb",
    `${rgb.r}, ${rgb.g}, ${rgb.b}`
  );
  // Tint (mix with white at 85%)
  root.style.setProperty(
    "--color-accent-light",
    mixWithWhite(rgb, 0.85)
  );
  // Shade (mix with black at 80%)
  root.style.setProperty(
    "--color-accent-dark",
    mixWithBlack(rgb, 0.8)
  );
}

function mixWithWhite(
  { r, g, b }: { r: number; g: number; b: number },
  factor: number
): string {
  const mix = (c: number) => Math.round(c + (255 - c) * factor);
  return rgbToHex(mix(r), mix(g), mix(b));
}

function mixWithBlack(
  { r, g, b }: { r: number; g: number; b: number },
  factor: number
): string {
  const mix = (c: number) => Math.round(c * factor);
  return rgbToHex(mix(r), mix(g), mix(b));
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}
