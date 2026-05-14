"use client";

/**
 * AccentColourInit
 * Imported once in the root layout (or closest client boundary) to:
 *  1. Pull in the global accent CSS overrides
 *  2. Mount the AccentColourProvider so all children can consume the context
 */

import "./accent-colour-globals.css";
import React from "react";
import { AccentColourProvider } from "./AccentColourProvider";

export function AccentColourInit({ children }: { children: React.ReactNode }) {
  return <AccentColourProvider>{children}</AccentColourProvider>;
}
