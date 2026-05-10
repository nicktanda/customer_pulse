import { useCallback, useEffect, useState } from "react";
import {
  applyAccentColor,
  ACCENT_COLOR_STORAGE_KEY,
  DEFAULT_ACCENT_COLOR,
  meetsWcagAA,
} from "../lib/accent-color";

export interface UseAccentColorReturn {
  accentColor: string;
  contrastWarning: boolean;
  setAccentColor: (hex: string) => void;
  resetAccentColor: () => void;
  isSaving: boolean;
  saveError: string | null;
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
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      // 1. Apply cached value immediately to avoid FOUC
      const cached =
        typeof localStorage !== "undefined"
          ? localStorage.getItem(ACCENT_COLOR_STORAGE_KEY)
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
            localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, data.accentColor);
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
    setSaveError(null);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, hex);
    }

    // Persist to server
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor: hex }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          (data as { error?: string }).error ??
          `Server error (${res.status})`;
        console.warn("[useAccentColor] Failed to persist accent colour:", message);
        setSaveError(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      console.warn("[useAccentColor] Failed to persist accent colour:", message);
      setSaveError(message);
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
    saveError,
  };
}
