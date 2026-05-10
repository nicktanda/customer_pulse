import { useCallback, useEffect, useState } from "react";
import {
  applyAccentColor,
  DEFAULT_ACCENT_COLOR,
  meetsWcagAA,
} from "../lib/accent-color";

const STORAGE_KEY = "user_accent_color";

export interface UseAccentColorReturn {
  accentColor: string;
  contrastWarning: boolean;
  setAccentColor: (hex: string) => void;
  resetAccentColor: () => void;
  isSaving: boolean;
}

/**
 * Manages the user's chosen accent colour.
 *
 * Priority order:
 *   1. Server-persisted preference (fetched on mount)
 *   2. localStorage cache (for instant paint on next load)
 *   3. Hard-coded brand default
 *
 * The preference is optimistically applied locally and then persisted
 * to the server in the background.
 */
export function useAccentColor(): UseAccentColorReturn {
  const [accentColor, setAccentColorState] = useState<string>(
    DEFAULT_ACCENT_COLOR
  );
  const [contrastWarning, setContrastWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      // 1. Apply cached value immediately to avoid FOUC
      const cached =
        typeof localStorage !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (cached) {
        setAccentColorState(cached);
        applyAccentColor(cached);
      }

      // 2. Fetch server preference (overrides cache if different)
      try {
        const res = await fetch("/api/user/preferences");
        if (res.ok) {
          const data = (await res.json()) as { accentColor?: string };
          if (data.accentColor) {
            setAccentColorState(data.accentColor);
            applyAccentColor(data.accentColor);
            localStorage.setItem(STORAGE_KEY, data.accentColor);
          }
        }
      } catch {
        // Non-critical – fall back to cached/default
      }
    };

    loadPreference();
  }, []);

  // Re-evaluate contrast whenever colour changes
  useEffect(() => {
    setContrastWarning(!meetsWcagAA(accentColor));
  }, [accentColor]);

  const setAccentColor = useCallback(async (hex: string) => {
    // Optimistic update
    setAccentColorState(hex);
    applyAccentColor(hex);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, hex);
    }

    // Persist to server
    setIsSaving(true);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor: hex }),
      });
    } catch {
      // Swallow – local preference is still applied
    } finally {
      setIsSaving(false);
    }
  }, []);

  const resetAccentColor = useCallback(async () => {
    await setAccentColor(DEFAULT_ACCENT_COLOR);
  }, [setAccentColor]);

  return {
    accentColor,
    contrastWarning,
    setAccentColor,
    resetAccentColor,
    isSaving,
  };
}
