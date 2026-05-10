"use client";

/**
 * AccentColorProvider
 *
 * Reads the persisted accent colour from localStorage on the client and
 * applies it as a CSS custom property before the first paint.  Wrap this
 * high in the component tree (e.g. inside the root layout) so that the
 * property is available everywhere.
 *
 * This is a pure client component – it renders no DOM of its own.
 */

import { useEffect } from "react";
import {
  applyAccentColor,
  readStoredAccentColor,
} from "../lib/accentColor";

export function AccentColorProvider({
  children,
  serverValue,
}: {
  children: React.ReactNode;
  serverValue?: string | null;
}) {
  useEffect(() => {
    const colour = serverValue ?? readStoredAccentColor();
    if (colour) {
      applyAccentColor(colour);
    }
  }, [serverValue]);

  // No extra DOM wrapper – just pass children through
  return <>{children}</>;
}
