'use client';

import { AccentColourInit } from './AccentColourInit';

/**
 * Thin shell that provides the AccentColourInit wrapper for use in layout files.
 * Import this in the app-shell layout to ensure the accent colour provider
 * and global CSS are mounted for every authenticated page.
 */
export function AccentColourShell({ children }: { children: React.ReactNode }) {
  return <AccentColourInit>{children}</AccentColourInit>;
}
