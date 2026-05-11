"use client";

import { useEffect } from "react";
import {
  ACCENT_STORAGE_KEY,
  ACCENT_CSS_PROPERTY,
  ACCENT_FEATURE_FLAG_KEY,
} from "../lib/accentColorConstants";

/**
 * AccentColorInit
 *
 * Injected once near the top of the layout tree. On mount it reads the
 * stored accent colour from localStorage and applies it to the document
 * root as a CSS custom property.
 *
 * NOTE: Because this uses useEffect it runs after the first paint, so a
 * brief flash of the default brand colour is still possible. For true
 * FOUC prevention a blocking inline <script> in <head> would be needed.
 */
export function AccentColorInit() {
  useEffect(() => {
    const featureEnabled =
      process.env.NEXT_PUBLIC_ACCENT_COLOR_ENABLED === "true" ||
      localStorage.getItem(ACCENT_FEATURE_FLAG_KEY) === "true";
    if (!featureEnabled) return;

    try {
      const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (stored && /^#[0-9A-Fa-f]{6}$/.test(stored)) {
        document.documentElement.style.setProperty(ACCENT_CSS_PROPERTY, stored);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  return null;
}
