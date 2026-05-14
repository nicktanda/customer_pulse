"use client";

import { useEffect } from "react";
import { applyAccentColour, getStoredAccentColour } from "./accent-colour-utils";

interface AccentColourProviderProps {
  /** Server-persisted colour id — takes priority over localStorage */
  serverColourId?: string;
  children: React.ReactNode;
}

/**
 * Mount this near the top of the component tree.
 * It applies the accent colour on the client as early as possible,
 * preventing a flash of the default blue before JS hydrates.
 */
export function AccentColourProvider({
  serverColourId,
  children,
}: AccentColourProviderProps) {
  useEffect(() => {
    const id = serverColourId ?? getStoredAccentColour();
    applyAccentColour(id);
  }, [serverColourId]);

  return <>{children}</>;
}
