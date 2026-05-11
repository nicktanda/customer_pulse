import { useEffect, useState, useCallback } from 'react';
import {
  DEFAULT_ACCENT,
  applyAccentToDom,
  isValidHex,
} from './accentColour';

const STORAGE_KEY = 'user_accent_colour';

/**
 * Manages the user's accent colour preference.
 *
 * On mount it reads from localStorage (guest fallback) and applies the CSS
 * custom property to :root. When a real user preference is passed in (from
 * the server/API), that value takes priority.
 */
export function useAccentColour(serverValue?: string | null) {
  const [accent, setAccentState] = useState<string>(() => {
    if (serverValue && isValidHex(serverValue)) return serverValue;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidHex(stored)) return stored;
    }
    return DEFAULT_ACCENT;
  });

  // Sync to DOM whenever accent changes.
  useEffect(() => {
    applyAccentToDom(accent);
  }, [accent]);

  // If a new serverValue arrives (e.g. after auth), adopt it.
  useEffect(() => {
    if (serverValue && isValidHex(serverValue)) {
      setAccentState(serverValue);
    }
  }, [serverValue]);

  const setAccent = useCallback(
    (value: string) => {
      if (!isValidHex(value)) return;
      setAccentState(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, value);
      }
    },
    [],
  );

  return { accent, setAccent };
}
