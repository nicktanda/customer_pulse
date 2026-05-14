"use client";

/**
 * AccentColourLayoutWrapper
 *
 * A thin client component that mounts the AccentColourProvider (and loads the
 * global accent CSS) for the entire authenticated app shell. Import and render
 * this in the authenticated layout so theming is active app-wide.
 *
 * Usage in apps/web/src/app/app/layout.tsx:
 *   import { AccentColourLayoutWrapper } from "@/components/accent-colour/AccentColourLayoutWrapper";
 *   // wrap {children} with <AccentColourLayoutWrapper>{children}</AccentColourLayoutWrapper>
 */

import React from "react";
import { AccentColourProvider } from "./accent-colour-context";
import "./accent-colour.css";

export function AccentColourLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccentColourProvider>{children}</AccentColourProvider>;
}
