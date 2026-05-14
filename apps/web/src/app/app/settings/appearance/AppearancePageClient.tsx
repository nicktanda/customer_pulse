"use client";

/**
 * AppearancePageClient
 *
 * Ensures the AccentColourProvider is available on the Appearance settings
 * page even before the global layout wrapper is confirmed to be wired in.
 * This is a safety net — the layout-level AccentColourLayoutWrapper is the
 * primary provider mount point.
 */

import React from "react";
import { AccentColourLayoutWrapper } from "@/components/accent-colour/AccentColourLayoutWrapper";
import { AppearanceSettings } from "@/components/accent-colour/AppearanceSettings";

export function AppearancePageClient() {
  return (
    <AccentColourLayoutWrapper>
      <AppearanceSettings />
    </AccentColourLayoutWrapper>
  );
}
