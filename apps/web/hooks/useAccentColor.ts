import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ACCENT_COLOR,
  applyAccentColor,
  isValidHexColor,
  passesWcagAA,
  readStoredAccentColor,
  writeStoredAccentColor,
} from "../lib/accentColor";

export interface UseAccentColorReturn {
  /** Currently active accent colour (hex string). */
  accentColor: string;
  /** Whether the current colour passes WCAG AA contrast requirements. */
  passesContrast: boolean;
  /** Update the accent colour (validates, stores, and applies to DOM). */
  setAccentColor: (hex: string) => void;
  /** Reset to the default brand colour. */
  resetAccentColor: () => void;
}

/**
 * Manages the user accent colour:
 * 1. Reads initial value from localStorage (fast, no flicker).
 * 2. Accepts an optional `serverValue` (fetched from the user profile API)
 *    which takes precedence once available.
 * 3. Applies the colour to the document root via a CSS custom property.
 *    The DOM write is handled exclusively by a `useEffect` to avoid double
 *    application when state is updated.
 */
export function useAccentColor(
  serverValue?: string | null
): UseAccentColorReturn {
  const [accentColor, setColor] = useState<string>(() => {
    // Initialise from localStorage to prevent flash on hydration
    const stored = readStoredAccentColor();
    if (stored && isValidHexColor(stored)) return stored;
    return DEFAULT_ACCENT_COLOR;
  });

  // When the server-fetched preference arrives, adopt it
  useEffect(() => {
    if (serverValue && isValidHexColor(serverValue)) {
      setColor(serverValue);
    }
  }, [serverValue]);

  // Apply the colour to the DOM whenever it changes.
  // This is the ONLY place applyAccentColor is called so we never double-write.
  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  const setAccentColor = useCallback((hex: string) => {
    if (!isValidHexColor(hex)) return;
    setColor(hex);
    writeStoredAccentColor(hex);
    // Do NOT call applyAccentColor here – the effect above handles DOM updates.
  }, []);

  const resetAccentColor = useCallback(() => {
    setAccentColor(DEFAULT_ACCENT_COLOR);
  }, [setAccentColor]);

  return {
    accentColor,
    passesContrast: passesWcagAA(accentColor),
    setAccentColor,
    resetAccentColor,
  };
}
