/**
 * AccentColourProvider
 *
 * Mount this once near the root of the app. It reads the stored accent colour
 * from localStorage on the client and applies the CSS custom property to
 * `document.documentElement` so the rest of the app picks it up immediately.
 */
'use client';

import { useEffect } from 'react';
import { ACCENT_COLOURS } from '../hooks/useAccentColour';

const STORAGE_KEY = 'accent-colour';
const DEFAULT_VALUE = '#4F46E5'; // indigo

export function AccentColourProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    const colour =
      ACCENT_COLOURS.find((c) => c.id === storedId) ??
      ACCENT_COLOURS.find((c) => c.value === DEFAULT_VALUE)!;
    document.documentElement.style.setProperty('--accent-colour', colour.value);
    document.documentElement.setAttribute('data-accent', colour.id);
  }, []);

  return <>{children}</>;
}
