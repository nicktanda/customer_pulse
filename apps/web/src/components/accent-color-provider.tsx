'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_ACCENT_COLOR, isValidHex } from '@/lib/accent-color';

interface AccentColorContextValue {
  accentColor: string;
  setAccentColor: (hex: string) => void;
}

const AccentColorContext = createContext<AccentColorContextValue>({
  accentColor: DEFAULT_ACCENT_COLOR,
  setAccentColor: () => undefined,
});

export function useAccentColor(): AccentColorContextValue {
  return useContext(AccentColorContext);
}

interface AccentColorProviderProps {
  /** Initial accent colour loaded from the user's saved preference. */
  initialColor?: string | null;
  /** Whether the accent colour feature is enabled (feature flag). */
  enabled?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps the application and injects the --color-accent CSS custom property
 * onto the document root whenever the accent colour changes.
 */
export function AccentColorProvider({
  initialColor,
  enabled = true,
  children,
}: AccentColorProviderProps) {
  const resolved =
    enabled && initialColor && isValidHex(initialColor)
      ? initialColor
      : DEFAULT_ACCENT_COLOR;

  const [accentColor, setAccentColorState] = useState<string>(resolved);

  // Sync CSS custom property whenever the colour changes.
  // This single effect handles both initial mount and subsequent updates,
  // so no separate mount-only effect is needed.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-accent', accentColor);
    }
  }, [accentColor]);

  const setAccentColor = (hex: string) => {
    if (!isValidHex(hex)) return;
    setAccentColorState(hex);
  };

  return (
    <AccentColorContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </AccentColorContext.Provider>
  );
}
