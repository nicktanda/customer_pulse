'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ACCENT_COLOUR_ENABLED,
  applyAccentColour,
  DEFAULT_ACCENT_ID,
  persistAccentColour,
  readPersistedAccentColour,
} from '@/lib/accentColour';

interface AccentColourContextValue {
  accentId: string;
  setAccentId: (id: string) => void;
}

const AccentColourContext = createContext<AccentColourContextValue>({
  accentId: DEFAULT_ACCENT_ID,
  setAccentId: () => undefined,
});

export function useAccentColour(): AccentColourContextValue {
  return useContext(AccentColourContext);
}

export function AccentColourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accentId, setAccentIdState] = useState<string>(DEFAULT_ACCENT_ID);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (!ACCENT_COLOUR_ENABLED) return;
    const stored = readPersistedAccentColour();
    setAccentIdState(stored);
    applyAccentColour(stored);
  }, []);

  const setAccentId = useCallback((id: string) => {
    if (!ACCENT_COLOUR_ENABLED) return;
    setAccentIdState(id);
    applyAccentColour(id);
    persistAccentColour(id);
  }, []);

  return (
    <AccentColourContext.Provider value={{ accentId, setAccentId }}>
      {children}
    </AccentColourContext.Provider>
  );
}
