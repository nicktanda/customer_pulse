"use client";

/**
 * AccentColorProvider
 *
 * Reads the persisted accent colour from localStorage on the client and
 * applies it as a CSS custom property before the first paint.  Wrap this
 * high in the component tree (e.g. inside the root layout) so that the
 * property is available everywhere.
 *
 * Note: This provider handles the *initial* application of the accent colour
 * on page load (from localStorage or a server-supplied value).  Runtime
 * changes during the session are handled directly by `useAccentColor` via
 * `applyAccentColor` — the Provider does not need to track those.
 *
 * This is a pure client component – it renders no DOM of its own.
 */

import { useEffect } from "react";
import { applyAccentColor, readStoredAccentColor } from "../lib/accentColor";

export function AccentColorProvider({
  children,
  serverValue,
}: {
  children: React.ReactNode;
  serverValue?: string | null;
}) {
  useEffect(() => {
    // serverValue (from DB) takes precedence over localStorage
    const colour = serverValue ?? readStoredAccentColor();
    if (colour) {
      applyAccentColor(colour);
    }
    // Re-run if a server value arrives (e.g. after authentication)
  }, [serverValue]);

  // No extra DOM wrapper – just pass children through
  return <>{children}</>;
}
