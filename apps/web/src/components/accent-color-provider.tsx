'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  /**
   * Whether the accent colour feature is enabled (feature flag).
   *
   * NOTE: `useState` is initialised from `resolved` at mount time.
   * If `initialColor` or `enabled` change after mount (e.g. a user logs
   * in mid-session without a full page reload), the context value will
   * not automatically re-sync. For the current SSR-driven use case this
   * is acceptable because the page re-renders from the server on navigation.
   */
  enabled?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps the application and injects the --color-accent CSS custom property
 * onto the document root whenever the accent colour changes.
 *
 * IMPORTANT — nested provider caveat: both the root provider (in layout.tsx)
 * and any nested provider (e.g. ProfilePage) write to the same
 * document.documentElement CSS property. On unmount, this provider restores
 * the previous value it observed at mount time so the root provider's colour
 * is preserved when navigating away from a page that uses a nested provider.
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

  // Track the CSS custom property value that was set before this provider
  // mounted so we can restore it on unmount (nested provider cleanup).
  const previousCssValueRef = useRef<string | null>(null);

  // Capture the pre-mount CSS value once on mount.
  useEffect(() => {
    previousCssValueRef.current =
      document.documentElement.style.getPropertyValue('--color-accent') || null;

    return () => {
      // Restore the previous value when this provider unmounts (e.g. when
      // navigating away from a page that uses a nested AccentColorProvider).
      if (previousCssValueRef.current !== null) {
        document.documentElement.style.setProperty(
          '--color-accent',
          previousCssValueRef.current,
        );
      } else {
        document.documentElement.style.removeProperty('--color-accent');
      }
    };
  }, []);

  // Sync CSS custom property whenever the colour changes.
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor);
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
