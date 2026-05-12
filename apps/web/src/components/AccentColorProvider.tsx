"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_ACCENT,
  FEATURE_FLAG,
  STORAGE_KEY,
  applyAccentColor,
} from "../lib/accentColor";

interface AccentColorContextValue {
  accentColor: string;
  setAccentColor: (hex: string) => void;
  isFeatureEnabled: boolean;
}

const AccentColorContext = createContext<AccentColorContextValue>({
  accentColor: DEFAULT_ACCENT,
  setAccentColor: () => undefined,
  isFeatureEnabled: false,
});

export function useAccentColor(): AccentColorContextValue {
  return useContext(AccentColorContext);
}

interface AccentColorProviderProps {
  /**
   * The persisted accent colour loaded server-side (e.g. from the user's
   * profile record).  Falls back to DEFAULT_ACCENT when omitted.
   *
   * Note on precedence: if localStorage already contains a cached colour,
   * it takes priority over this prop on the client. This handles the common
   * case where the user changed their colour in another tab or the server
   * value is stale. To force the server value, clear localStorage first.
   */
  initialColor?: string;
  /**
   * Feature-flag value.  When false the provider is a no-op and the CSS
   * custom property keeps its stylesheet default.
   */
  featureEnabled?: boolean;
  children: React.ReactNode;
}

/**
 * AccentColorProvider
 *
 * Wrap this around (or inside) your root layout so that:
 *   1. The CSS custom property is applied immediately on mount
 *   2. Any component can call `useAccentColor()` to read or update the colour
 *   3. Changes are persisted to localStorage as a local cache between page loads
 *
 * Note: `applyAccentColor` is called in two effects. The second effect
 * (watching `accentColor`) is intentional — it keeps the DOM in sync when
 * `setAccentColor` is called programmatically. `applyAccentColor` already
 * validates the hex before writing, so duplicate calls are harmless.
 */
export function AccentColorProvider({
  initialColor,
  featureEnabled = false,
  children,
}: AccentColorProviderProps) {
  const [accentColor, setAccentColorState] = useState<string>(
    initialColor ?? DEFAULT_ACCENT
  );

  // On mount: prefer localStorage cache over SSR prop.
  useEffect(() => {
    if (!featureEnabled) return;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setAccentColorState(cached);
        applyAccentColor(cached);
        return;
      }
    } catch {
      // localStorage blocked (private browsing, etc.)
    }
    applyAccentColor(accentColor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once

  // Whenever accentColor changes (programmatically), keep the DOM in sync.
  useEffect(() => {
    if (!featureEnabled) return;
    applyAccentColor(accentColor);
  }, [accentColor, featureEnabled]);

  function setAccentColor(hex: string) {
    setAccentColorState(hex);
    applyAccentColor(hex);
    try {
      localStorage.setItem(STORAGE_KEY, hex);
    } catch {
      // ignore
    }
  }

  return (
    <AccentColorContext.Provider
      value={{
        accentColor,
        setAccentColor,
        isFeatureEnabled: featureEnabled,
      }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}

// Re-exported for convenience; prefer importing directly from lib/accentColor.
export { FEATURE_FLAG };
