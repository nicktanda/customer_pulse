"use client";

import { useEffect } from "react";
import {
  applyAccentColor,
  DEFAULT_ACCENT_COLOR,
  ACCENT_COLOR_STORAGE_KEY,
  isValidHex,
} from "@/lib/accentColor";

/**
 * Drop this once at the top of the component tree (e.g. in the root layout).
 * It reads the stored preference and applies the CSS custom property as early
 * as possible to avoid a flash of the default colour.
 *
 * This is the single authoritative place for hydrating the accent colour from
 * storage. Components that need to read or change the colour at runtime should
 * use the `useAccentColor` hook instead.
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
      const stored = localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
      const color =
        stored && isValidHex(stored) ? stored : DEFAULT_ACCENT_COLOR;
      applyAccentColor(color);
    } catch {
      applyAccentColor(DEFAULT_ACCENT_COLOR);
    }
  }, [enabled]);

  return <>{children}</>;
}
