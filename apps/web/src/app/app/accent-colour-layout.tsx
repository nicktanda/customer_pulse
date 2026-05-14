'use client';

/**
 * Client boundary that mounts AccentColourInit for the entire app/ subtree.
 * Imported by the app/layout.tsx so every authenticated page benefits from
 * the stored accent colour preference.
 */
import { AccentColourInit } from '@/components/accent-colour';

export function AccentColourLayout({ children }: { children: React.ReactNode }) {
  return <AccentColourInit>{children}</AccentColourInit>;
}
