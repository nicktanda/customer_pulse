import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_ACCENT_COLOR,
  applyAccentColor,
  isValidHex,
} from "@/lib/accentColor";

const STORAGE_KEY = "user_accent_color";

/**
 * Hook that manages the active accent colour.
 *
 * - Reads from localStorage on mount and applies it immediately.
 * - Exposes a setter that validates, applies, and persists the new colour.
 * - Falls back to DEFAULT_ACCENT_COLOR when nothing is stored.
 */
export function useAccentColor() {
  const [accentColor, setAccentColorState] = useState<string>(
    DEFAULT_ACCENT_COLOR
  );

  // Hydrate from storage on first render
  useEffect(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    const initial =
      stored && isValidHex(stored) ? stored : DEFAULT_ACCENT_COLOR;
    setAccentColorState(initial);
    applyAccentColor(initial);
  }, []);

  const setAccentColor = useCallback((hex: string) => {
    if (!isValidHex(hex)) return;
    setAccentColorState(hex);
    applyAccentColor(hex);
    try {
      localStorage.setItem(STORAGE_KEY, hex);
    } catch {
      // Ignore storage errors (e.g. private browsing quota)
    }
  }, []);

  const resetAccentColor = useCallback(() => {
    setAccentColor(DEFAULT_ACCENT_COLOR);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [setAccentColor]);

  return { accentColor, setAccentColor, resetAccentColor };
}
