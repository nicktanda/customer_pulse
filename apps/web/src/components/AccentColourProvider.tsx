'use client';

import { useEffect } from 'react';
import { applyAccentColour, readPersistedAccentId } from '../lib/accentColour';

/**
 * Drop this component high in the React tree (e.g. inside RootLayout).
 * It reads the persisted accent from localStorage on mount and applies it
 * to the document root so the CSS variables are always in sync.
 *
 * Only rendered when the NEXT_PUBLIC_ACCENT_COLOUR_PICKER flag is true.
 */
export default function AccentColourProvider() {
  useEffect(() => {
    const id = readPersistedAccentId();
    applyAccentColour(id);
  }, []);

  // Renders nothing — only a side-effect provider.
  return null;
}
