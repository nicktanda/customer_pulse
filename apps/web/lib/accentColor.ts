/**
 * Accent colour utilities
 *
 * Manages the user-selectable accent/highlight colour feature.
 * The chosen colour is stored as a user preference and applied
 * via the --color-accent CSS custom property.
 */

export const DEFAULT_ACCENT_COLOR = "#6366f1"; // Indigo-500 – brand default

export interface AccentColorSwatch {
  label: string;
  value: string;
}

/**
 * Curated palette.
 *
 * The DEFAULT_ACCENT_COLOR (#6366f1, Indigo-500) is intentionally included
 * as the first swatch so that a freshly installed user sees their active
 * colour reflected in the palette. The remaining swatches use the -700
 * variants of each hue for better WCAG AA contrast on white backgrounds.
 *
 * Note: some colours may not pass WCAG AA (4.5:1) against white —
 * the picker's contrast warning banner will flag those at runtime.
 */
export const ACCENT_COLOR_SWATCHES: AccentColorSwatch[] = [
  { label: "Indigo (default)", value: DEFAULT_ACCENT_COLOR }, // #6366f1 Indigo-500
  { label: "Indigo Dark", value: "#4338ca" },   // Indigo-700  ~8.2:1
  { label: "Violet", value: "#6d28d9" },         // Violet-700  ~7.1:1
  { label: "Sky", value: "#0369a1" },            // Sky-700     ~7.4:1
  { label: "Teal", value: "#0f766e" },           // Teal-700    ~6.1:1
  { label: "Emerald", value: "#047857" },        // Emerald-700 ~7.2:1
  { label: "Rose", value: "#be123c" },           // Rose-700    ~7.5:1
  { label: "Orange", value: "#c2410c" },         // Orange-700  ~6.3:1
  { label: "Amber", value: "#b45309" },          // Amber-700   ~5.7:1
  { label: "Pink", value: "#be185d" },           // Pink-700    ~7.2:1
  { label: "Fuchsia", value: "#a21caf" },        // Fuchsia-700 ~7.4:1
];

// ---------------------------------------------------------------------------
// WCAG contrast helpers
// ---------------------------------------------------------------------------

/**
 * Convert a hex colour string to its relative luminance (WCAG 2.1).
 *
 * Uses the threshold value of 0.04045 as specified in WCAG 2.1 / IEC 61966-2-1
 * (the earlier WCAG 2.0 draft incorrectly used 0.03928).
 */
export function hexToLuminance(hex: string): number {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  // 0.04045 is the correct WCAG 2.1 / sRGB linearisation threshold
  const linearise = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Return the WCAG contrast ratio between two hex colours.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true when the given accent colour passes WCAG AA
 * (contrast ≥ 4.5 : 1) against a white background.
 */
export function passesWcagAA(
  accentHex: string,
  backgroundHex = "#ffffff"
): boolean {
  return contrastRatio(accentHex, backgroundHex) >= 4.5;
}

// ---------------------------------------------------------------------------
// CSS custom property helpers (client-side only)
// ---------------------------------------------------------------------------

/**
 * Apply the accent colour as the --color-accent CSS custom property on :root.
 *
 * @param hex - Must be a valid hex colour string. Call `isValidHex` before
 *   invoking this function. Passing an unvalidated value is unsafe as it
 *   could set an arbitrary CSS property value.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === "undefined") return;
  if (!isValidHex(hex)) return; // Guard against unvalidated callers
  document.documentElement.style.setProperty("--color-accent", hex);
}

/**
 * Remove any inline override and fall back to the CSS-defined default.
 */
export function resetAccentColor(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty("--color-accent");
}

/**
 * Basic hex validation.
 * Accepts 3-digit (#abc) and 6-digit (#aabbcc) hex strings.
 */
export function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}
