"use client";

import { useEffect } from "react";
import { applyAccentColor, DEFAULT_ACCENT_COLOR, isValidHex } from "@/lib/accentColor";

const STORAGE_KEY = "user_accent_color";

/**
 * Drop this once at the top of the component tree (e.g. in the root layout).
 * It reads the stored preference and applies the CSS custom property as early
 * as possible to avoid a flash of the default colour.
 *
 * Feature-flagged: set NEXT_PUBLIC_FEATURE_ACCENT_COLOR=true to activate.
 */
export function AccentColorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOR === "true";

  useEffect(() => {
    if (!enabled) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const color =
        stored && isValidHex(stored) ? stored : DEFAULT_ACCENT_COLOR;
      applyAccentColor(color);
    } catch {
      applyAccentColor(DEFAULT_ACCENT_COLOR);
    }
  }, [enabled]);

  return <>{children}</>;
}
