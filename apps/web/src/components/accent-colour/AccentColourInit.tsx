"use client";

/**
 * AccentColourInit
 * Mounts the AccentColourProvider so the accent preference is applied
 * on every page. Import this once in a layout.
 */
import React from "react";
import { AccentColourProvider } from "./AccentColourContext";
import "./accent-colour.css";

export function AccentColourInit({ children }: { children: React.ReactNode }) {
  return <AccentColourProvider>{children}</AccentColourProvider>;
}
