"use client";

import { useEffect } from "react";

const STORAGE_KEY = "user_accent_color";
const CSS_PROPERTY = "--color-accent";

/**
 * AccentColorInit
 *
 * Injected once near the top of the layout tree.  On mount it reads the
 * stored accent colour from localStorage and applies it to the document
 * root so the custom property is set before the first paint, preventing
 * a flash of the default brand colour.
 */
export function AccentColorInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const featureEnabled =
      process.env.NEXT_PUBLIC_ACCENT_COLOR_ENABLED === "true" ||
      localStorage.getItem("accent_color_enabled") === "true";
    if (!featureEnabled) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && /^#[0-9A-Fa-f]{6}$/.test(stored)) {
        document.documentElement.style.setProperty(CSS_PROPERTY, stored);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  return null;
}
