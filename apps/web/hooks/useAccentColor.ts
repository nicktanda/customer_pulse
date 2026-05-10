import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ACCENT_COLOR,
  ACCENT_LS_KEY,
  applyAccentColor,
  isValidHex,
  storeAccentColor,
  readStoredAccentColor,
} from "../lib/accentColor";

export interface UseAccentColorReturn {
  /** Currently active accent colour (hex string). */
  accentColor: string;
  /** Update the accent colour locally and persist it. */
  setAccentColor: (hex: string) => void;
  /** Persist to the server (no-op stub; replace with real API call). */
  saveAccentColor: (hex: string) => Promise<void>;
  /** Whether the server save is in progress. */
  isSaving: boolean;
}

/**
 * Manages the user's accent colour preference.
 *
 * On mount it reads from localStorage (fast, avoids flash of default colour)
 * and applies the CSS custom property.  When the user changes their colour
 * the hook updates state, persists to localStorage, and can optionally call
 * the server API.
 */
export function useAccentColor(
  /** Colour already stored on the server (from profile API). */
  serverValue?: string | null
): UseAccentColorReturn {
  const initial =
    (serverValue && isValidHex(serverValue) ? serverValue : null) ??
    readStoredAccentColor() ??
    DEFAULT_ACCENT_COLOR;

  const [accentColor, setAccentColorState] = useState<string>(initial);
  const [isSaving, setIsSaving] = useState(false);

  // Apply on mount and whenever the value changes
  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  // Sync from server value when it arrives (e.g. after auth)
  useEffect(() => {
    if (serverValue && isValidHex(serverValue)) {
      setAccentColorState(serverValue);
    }
  }, [serverValue]);

  const setAccentColor = useCallback((hex: string) => {
    if (!isValidHex(hex)) return;
    setAccentColorState(hex);
    storeAccentColor(hex);
    applyAccentColor(hex);
  }, []);

  /**
   * Persist the colour to the server.
   *
   * Replace the fetch call below with your real API client.
   * The function is intentionally separated from `setAccentColor` so that
   * local preview (instant) and remote persistence (async) are decoupled.
   */
  const saveAccentColor = useCallback(
    async (hex: string): Promise<void> => {
      if (!isValidHex(hex)) return;
      setIsSaving(true);
      try {
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accentColor: hex }),
        });
        // Also persist locally so next page-load is fast
        storeAccentColor(hex);
      } catch (err) {
        console.warn("[useAccentColor] Failed to save preference:", err);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return { accentColor, setAccentColor, saveAccentColor, isSaving };
}
