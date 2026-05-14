"use client";

import React from "react";
import { AccentColourInit } from "./AccentColourInit";

/**
 * AccentColourAppWrapper
 *
 * Drop this into the authenticated app layout so the accent colour context
 * and CSS custom-property overrides are available across the entire app,
 * not just on the Appearance settings page.
 */
export function AccentColourAppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccentColourInit>{children}</AccentColourInit>;
}
