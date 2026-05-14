"use client";

/**
 * Tiny client component placeholder — the actual pre-hydration script
 * lives in accent-init-script.ts (no "use client") so it can be called
 * from server components like layout.tsx.
 */
import { useEffect } from "react";

export function AccentInit() {
  useEffect(() => {
    // Pre-hydration accent is handled by the inline <script> in layout.tsx.
  }, []);

  return null;
}
