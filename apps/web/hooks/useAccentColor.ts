import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_ACCENT_COLOR,
  ACCENT_COLOR_STORAGE_KEY,
  applyAccentColor,
  isValidHex,
} from "@/lib/accentColor";

/**
 * Hook that manages the active accent colour.
 *
 * - Reads from localStorage on mount and applies it immediately.
 * - Exposes a setter that validates, applies, and persists the new colour.
 * - Falls back to DEFAULT_ACCENT_COLOR when nothing is stored.
 *
 * Note: initialises with DEFAULT_ACCENT_COLOR on the server and hydrates
 * from localStorage in a useEffect, which may cause a brief flash of the
 * default colour before the stored preference is applied. Mount
 * AccentColorProvider as high in the tree as possible to minimise this.
 */
export function useAccentColor() {
  const [accentColor, setAccentColorState] = useState<string>(
    DEFAULT_ACCENT_COLOR
  );

  // Hydrate from storage on first render (client-side only)
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(ACCENT_COLOR_STORAGE_KEY)
          : null;
      const initial =
        stored && isValidHex(stored) ? stored : DEFAULT_ACCENT_COLOR;
      setAccentColorState(initial);
      applyAccentColor(initial);
    } catch {
      // Ignore storage errors (e.g. private browsing)
      applyAccentColor(DEFAULT_ACCENT_COLOR);
    }
  }, []);

  const setAccentColor = useCallback((hex: string) => {
    if (!isValidHex(hex)) return;
    setAccentColorState(hex);
    applyAccentColor(hex);
    try {
      localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, hex);
    } catch {
      // Ignore storage errors (e.g. private browsing quota)
    }
  }, []);

  const resetAccentColor = useCallback(() => {
    setAccentColor(DEFAULT_ACCENT_COLOR);
    try {
      localStorage.removeItem(ACCENT_COLOR_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [setAccentColor]);

  return { accentColor, setAccentColor, resetAccentColor };
}
