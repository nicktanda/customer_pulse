import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ACCENT_COLOR,
  applyAccentColor,
  isValidHex,
  passesWcagAA,
} from "../lib/accentColor";

const STORAGE_KEY = "user_accent_color";

export interface UseAccentColorReturn {
  accentColor: string;
  contrastWarning: boolean;
  setAccentColor: (hex: string) => void;
  resetToDefault: () => void;
}

/**
 * Manages the user accent colour:
 * - Reads from / writes to localStorage (client-side fallback before the
 *   server-persisted preference is loaded).
 * - Applies the colour to the :root CSS custom property.
 * - Exposes a WCAG AA contrast warning flag.
 */
export function useAccentColor(
  serverValue?: string | null
): UseAccentColorReturn {
  // Lazy initialiser: because this hook is only used inside "use client"
  // components it always runs in the browser. The function executes
  // synchronously during the first client render (not *after* hydration),
  // so `readFromStorage()` may return a value that differs from what the
  // server rendered. If a `serverValue` is provided it always takes
  // precedence, preventing hydration mismatches for persisted preferences.
  const [accentColor, setColorState] = useState<string>(() => {
    if (serverValue) return serverValue;
    return readFromStorage() ?? DEFAULT_ACCENT_COLOR;
  });

  const [contrastWarning, setContrastWarning] = useState<boolean>(() =>
    !passesWcagAA(serverValue ?? readFromStorage() ?? DEFAULT_ACCENT_COLOR)
  );

  // Apply on mount and whenever the value changes
  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  const setAccentColor = useCallback((hex: string) => {
    if (!isValidHex(hex)) return;
    setColorState(hex);
    setContrastWarning(!passesWcagAA(hex));
    try {
      localStorage.setItem(STORAGE_KEY, hex);
    } catch {
      // storage unavailable – silently ignore
    }
    // Note: applyAccentColor is called by the useEffect above;
    // we do NOT call it directly here to avoid a double-apply.
  }, []);

  const resetToDefault = useCallback(() => {
    setAccentColor(DEFAULT_ACCENT_COLOR);
  }, [setAccentColor]);

  return { accentColor, contrastWarning, setAccentColor, resetToDefault };
}

function readFromStorage(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
