"use client";

import { useEffect } from "react";
import { applyAccentColor, DEFAULT_ACCENT_COLOR } from "../lib/accentColor";
import { FLAG_ACCENT_COLOR, isFlagEnabled } from "../lib/featureFlags";

const STORAGE_KEY = "user_accent_color";

/**
 * Mount this once in the root layout (client component).
 * It reads the persisted preference and injects the CSS custom property
 * before the first paint, avoiding a flash of the default brand colour.
 */
export function AccentColorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!isFlagEnabled(FLAG_ACCENT_COLOR, "accent_color")) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    applyAccentColor(stored ?? DEFAULT_ACCENT_COLOR);
  }, []);

  return <>{children}</>;
}
