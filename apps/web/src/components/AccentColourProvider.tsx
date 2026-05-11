'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAccentColour } from '../lib/useAccentColour';

interface AccentColourContextValue {
  accent: string;
  setAccent: (hex: string) => void;
}

const AccentColourContext = createContext<AccentColourContextValue | null>(null);

interface AccentColourProviderProps {
  children: ReactNode;
  /** Server-resolved preference, e.g. fetched from DB during SSR. */
  initialValue?: string | null;
  /** Feature flag — when false the provider is a no-op. */
  enabled?: boolean;
}

export function AccentColourProvider({
  children,
  initialValue,
  enabled = true,
}: AccentColourProviderProps) {
  const { accent, setAccent } = useAccentColour(enabled ? initialValue : null);

  return (
    <AccentColourContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentColourContext.Provider>
  );
}

export function useAccentColourContext(): AccentColourContextValue {
  const ctx = useContext(AccentColourContext);
  if (!ctx) {
    throw new Error(
      'useAccentColourContext must be used within <AccentColourProvider>',
    );
  }
  return ctx;
}
