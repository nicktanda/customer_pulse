"use client";

/**
 * AccentColourInit
 *
 * Mounted near the root of the app (inside the authenticated layout or the
 * root layout). It provides the AccentColourContext to the entire subtree and
 * imports the global accent CSS so the custom-property overrides are available
 * everywhere without touching globals.css.
 */

import React from "react";
import { AccentColourProvider } from "./accent-colour-context";
import "./accent-colour.css";

export function AccentColourInit({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccentColourProvider>{children}</AccentColourProvider>;
}
