"use client";

import React, { createContext, useContext } from "react";
import { useAccentColor, UseAccentColorReturn } from "../hooks/useAccentColor";

const AccentColorContext = createContext<UseAccentColorReturn | null>(null);

export interface AccentColorProviderProps {
  children: React.ReactNode;
  /**
   * Server-fetched accent colour (from the user profile).
   * When provided it takes precedence over the localStorage value.
   */
  serverValue?: string | null;
}

/**
 * AccentColorProvider
 *
 * Wrap your application (or settings page) with this provider to make the
 * accent colour context available to all descendants.
 *
 * It also injects the CSS custom property onto <html> on mount.
 */
export function AccentColorProvider({
  children,
  serverValue,
}: AccentColorProviderProps) {
  const value = useAccentColor(serverValue);

  return (
    <AccentColorContext.Provider value={value}>
      {children}
    </AccentColorContext.Provider>
  );
}

/** Access the accent colour context. Must be used inside AccentColorProvider. */
export function useAccentColorContext(): UseAccentColorReturn {
  const ctx = useContext(AccentColorContext);
  if (!ctx) {
    throw new Error(
      "useAccentColorContext must be used inside <AccentColorProvider>"
    );
  }
  return ctx;
}
