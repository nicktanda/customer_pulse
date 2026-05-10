/**
 * useAccentColor
 *
 * Reads the accent colour preference for the current user, applies it as
 * a CSS custom property on <html>, and exposes helpers to update & persist it.
 *
 * Feature-flagged: if NEXT_PUBLIC_ACCENT_COLOR_ENABLED !== 'true' the hook is
 * a no-op and the default brand colour from accent-color.css is used.
 *
 * Note: ACCENT_COLOR_ENABLED is a build-time constant — Next.js inlines
 * NEXT_PUBLIC_* env vars at build time, so this cannot be changed at runtime.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Build-time constant. True when the accent colour feature is enabled. */
export const ACCENT_COLOR_ENABLED =
  process.env.NEXT_PUBLIC_ACCENT_COLOR_ENABLED === "true";

/**
 * @deprecated Use ACCENT_COLOR_ENABLED instead.
 * Kept for backward compatibility with any consumers referencing ACCENT_COLOR_FLAG.
 */
export const ACCENT_COLOR_FLAG = ACCENT_COLOR_ENABLED;

export const DEFAULT_ACCENT = "#6366f1";

export const CURATED_PALETTE: { label: string; value: string }[] = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Slate", value: "#475569" },
];

const STORAGE_KEY = "user_accent_color";

/** Regex for a valid 6-digit hex colour (with leading #). */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/**
 * Expand a 3-digit hex shorthand (#rgb) to 6-digit form (#rrggbb).
 * Returns the string unchanged if it is not a 3-digit shorthand.
 */
function expand3DigitHex(hex: string): string {
  const s = hex.startsWith("#") ? hex : `#${hex}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const [, r, g, b] = s.split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return s;
}

/**
 * Normalise an incoming hex string to a valid 6-digit form, or return null
 * if the value cannot be interpreted as a hex colour.
 */
function normaliseHex(raw: string): string | null {
  const expanded = expand3DigitHex(raw);
  return HEX_RE.test(expanded) ? expanded.toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// WCAG contrast helpers
// ---------------------------------------------------------------------------

/** Parse a hex colour string to [r, g, b] in 0–255 range. */
function hexToRgb(hex: string): [number, number, number] | null {
  const sanitised = hex.replace(/^#/, "");
  if (sanitised.length !== 6) return null;
  const int = parseInt(sanitised, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Relative luminance per WCAG 2.1 §1.4.3. */
function relativeLuminance(r: number, g: number, b: number): number {
  const normalise = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * normalise(r) + 0.7152 * normalise(g) + 0.0722 * normalise(b);
}

/**
 * Compute contrast ratio between two hex colours.
 * Returns the ratio (1–21) or null if a colour cannot be parsed.
 */
export function contrastRatio(
  hex1: string,
  hex2: string
): number | null {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;
  const L1 = relativeLuminance(...rgb1);
  const L2 = relativeLuminance(...rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true when the accent colour meets WCAG AA (4.5:1) against white,
 * which is the typical button / highlight background.
 */
export function meetsWcagAA(accentHex: string): boolean {
  // Normalise first so 3-digit shorthand colours are handled correctly.
  const normalised = normaliseHex(accentHex);
  if (!normalised) return false;
  const ratio = contrastRatio(normalised, "#ffffff");
  return ratio !== null && ratio >= 4.5;
}

// ---------------------------------------------------------------------------
// Apply to DOM
// ---------------------------------------------------------------------------

function applyAccentToDom(color: string) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-accent", color);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseAccentColorReturn {
  /** Currently active accent hex string. */
  accentColor: string;
  /** Set a new accent colour – validates and persists. */
  setAccentColor: (hex: string) => void;
  /** Whether the current colour passes WCAG AA. */
  passesContrast: boolean;
  /** Curated swatch palette. */
  palette: typeof CURATED_PALETTE;
  /** Reset to the default brand colour. */
  reset: () => void;
  /** Whether the feature is enabled via flag. */
  enabled: boolean;
}

export function useAccentColor(
  /** Optional server-side preference from the user's profile. */
  serverPreference?: string | null
): UseAccentColorReturn {
  const [accentColor, setAccentState] = useState<string>(() => {
    if (!ACCENT_COLOR_ENABLED) return DEFAULT_ACCENT;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const normalised = normaliseHex(stored);
        if (normalised) return normalised;
      }
    }
    if (serverPreference) {
      const normalised = normaliseHex(serverPreference);
      if (normalised) return normalised;
    }
    return DEFAULT_ACCENT;
  });

  // Apply on mount and whenever the colour changes.
  useEffect(() => {
    if (!ACCENT_COLOR_ENABLED) return;
    applyAccentToDom(accentColor);
  }, [accentColor]);

  // Sync server preference on first load (e.g. after SSR hydration).
  // We intentionally omit `accentColor` from deps: if the user has already
  // made a local selection we do not want to overwrite it on every render
  // just because `serverPreference` is stable. The sync only needs to fire
  // when the server value itself changes (e.g. user logs in with a different
  // account).
  useEffect(() => {
    if (!ACCENT_COLOR_ENABLED) return;
    if (serverPreference) {
      const normalised = normaliseHex(serverPreference);
      if (normalised && normalised !== accentColor) {
        setAccentState(normalised);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // `accentColor` is intentionally excluded — see comment above.
  }, [serverPreference]);

  const setAccentColor = useCallback((hex: string) => {
    if (!ACCENT_COLOR_ENABLED) return;
    const normalised = normaliseHex(hex);
    if (!normalised) {
      // Silently ignore invalid colour values (e.g. named colours, rgba strings).
      console.warn(`[useAccentColor] Invalid hex colour ignored: "${hex}"`);
      return;
    }
    setAccentState(normalised);
    applyAccentToDom(normalised);
    try {
      localStorage.setItem(STORAGE_KEY, normalised);
    } catch {
      // Storage unavailable – continue without persistence.
    }
  }, []);

  const reset = useCallback(() => {
    setAccentColor(DEFAULT_ACCENT);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [setAccentColor]);

  return {
    accentColor,
    setAccentColor,
    passesContrast: meetsWcagAA(accentColor),
    palette: CURATED_PALETTE,
    reset,
    enabled: ACCENT_COLOR_ENABLED,
  };
}
