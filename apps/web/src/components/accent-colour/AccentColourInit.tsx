'use client';

import { AccentColourProvider } from './AccentColourProvider';
import './accent-globals.css';

/**
 * Mounts the AccentColourProvider and imports the global accent CSS.
 * Drop this component once anywhere in the layout tree (e.g. root layout)
 * and it will keep the accent colour in sync with localStorage.
 */
export function AccentColourInit({ children }: { children: React.ReactNode }) {
  return <AccentColourProvider>{children}</AccentColourProvider>;
}
