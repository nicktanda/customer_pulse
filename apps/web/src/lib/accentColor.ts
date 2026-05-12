/**
 * Accent colour utilities.
 *
 * – CURATED_PALETTE: the 10 pre-vetted swatches shown in the picker.
 *   Note: Amber (#f59e0b) has a contrast ratio of ~2.9:1 against white,
 *   below WCAG AA. The picker will show a warning if a user selects it;
 *   this is intentional so users are aware of the accessibility trade-off.
 * – contrastRatio / isAccessible: WCAG 2.1 AA contrast-ratio validation
 * – applyAccentColor: writes the CSS custom property to :root
 *   (guarded by isValidHex — never writes arbitrary strings to the DOM)
 * – STORAGE_KEY / FEATURE_FLAG: constants used across the feature
 */

export const FEATURE_FLAG = "accent_color_picker";
export const STORAGE_KEY = "user_accent_color";
export const DEFAULT_ACCENT = "#6366f1";

export interface AccentSwatch {
  label: string;
  value: string; // hex
}

export const CURATED_PALETTE: AccentSwatch[] = [
  { label: "Indigo",   value: "#6366f1" },
  { label: "Violet",  value: "#8b5cf6" },
  { label: "Sky",     value: "#0ea5e9" },
  { label: "Teal",    value: "#14b8a6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber",   value: "#f59e0b" }, // ~2.9:1 on white — below AA; picker warns
  { label: "Rose",    value: "#f43f5e" },
  { label: "Pink",    value: "#ec4899" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Slate",   value: "#475569" },
];

/**
 * Parse a hex colour string to [r, g, b] in 0–255 range.
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Relative luminance per WCAG 2.1 (uses the corrected 0.04045 threshold).
 */
function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    // WCAG 2.1 specifies 0.04045 (not the older draft value of 0.03928)
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio between two hex colours.
 * Returns null if either colour is unparseable.
 */
export function contrastRatio(hex1: string, hex2: string): number | null {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true when the accent passes WCAG AA (4.5:1) against white.
 * Most accent colours are used on white backgrounds for text / focus rings.
 */
export function isAccessible(accentHex: string): boolean {
  const ratio = contrastRatio(accentHex, "#ffffff");
  if (ratio === null) return false;
  return ratio >= 4.5;
}

/**
 * Write the --color-accent CSS custom property to the document root.
 *
 * Validates `hex` with isValidHex before writing so arbitrary strings are
 * never passed to setProperty. Safe to call on every render; it's a cheap
 * DOM write.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  if (!isValidHex(hex)) return;
  document.documentElement.style.setProperty("--color-accent", hex);
}

/**
 * Validate a free-form hex string entered by the user.
 */
export function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}
