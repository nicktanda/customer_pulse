/**
 * AccentColourInitializer
 *
 * Mount this component once near the root of the app (e.g. in _app.tsx or a layout component).
 * It reads the stored accent colour from localStorage and applies it to the document root
 * so the correct CSS custom property is set before the first paint.
 */
'use client';

import { useEffect } from 'react';
import { loadAccentColour, applyAccentColour } from '../lib/accentColour';

export function AccentColourInitializer() {
  useEffect(() => {
    const id = loadAccentColour();
    applyAccentColour(id);
  }, []);

  return null;
}
