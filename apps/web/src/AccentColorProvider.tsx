/**
 * AccentColorProvider
 *
 * Wraps the application (or a subtree) to:
 *  1. Apply the user's stored accent colour on first render (client-side)
 *  2. Expose the accent colour context so child components can read/update it
 *
 * Place this provider near the top of your layout, e.g.:
 *
 *   // apps/web/src/app/layout.tsx
 *   import { AccentColorProvider } from "../AccentColorProvider";
 *   ...
 *   <AccentColorProvider serverPreference={session?.user?.accentColor}>
 *     {children}
 *   </AccentColorProvider>
 */

"use client";

import React, {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAccentColor, type UseAccentColorReturn } from "./useAccentColor";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AccentColorContext = createContext<UseAccentColorReturn | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface AccentColorProviderProps {
  children: ReactNode;
  /** Accent colour stored in the user's profile (from server session). */
  serverPreference?: string | null;
}

export function AccentColorProvider({
  children,
  serverPreference,
}: AccentColorProviderProps) {
  const value = useAccentColor(serverPreference);

  return (
    <AccentColorContext.Provider value={value}>
      {children}
    </AccentColorContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

/**
 * Access accent colour state from any client component.
 *
 * Must be used inside <AccentColorProvider>.
 */
export function useAccentColorContext(): UseAccentColorReturn {
  const ctx = useContext(AccentColorContext);
  if (!ctx) {
    throw new Error(
      "useAccentColorContext must be used inside <AccentColorProvider>"
    );
  }
  return ctx;
}
