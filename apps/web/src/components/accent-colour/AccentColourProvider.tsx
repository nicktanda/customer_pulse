'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ACCENT_COLOURS,
  ACCENT_STORAGE_KEY,
  AccentColourId,
  DEFAULT_ACCENT,
  applyAccentColour,
} from '@/lib/accent-colour';

interface AccentColourContextValue {
  accent: AccentColourId;
  setAccent: (id: AccentColourId) => void;
}

const AccentColourContext = createContext<AccentColourContextValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
});

function isValidAccentId(value: string | null): value is AccentColourId {
  return value !== null && ACCENT_COLOURS.some((c) => c.id === value);
}

export function AccentColourProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColourId>(DEFAULT_ACCENT);

  useEffect(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    const initial = isValidAccentId(stored) ? stored : DEFAULT_ACCENT;
    setAccentState(initial);
    applyAccentColour(initial);
  }, []);

  const setAccent = useCallback((id: AccentColourId) => {
    setAccentState(id);
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
    applyAccentColour(id);
  }, []);

  return (
    <AccentColourContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentColourContext.Provider>
  );
}

export function useAccentColour() {
  return useContext(AccentColourContext);
}
