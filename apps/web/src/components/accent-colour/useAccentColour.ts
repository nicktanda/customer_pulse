"use client";

import { useCallback, useState } from "react";
import { applyAccentColour } from "./accent-colour-utils";

/**
 * Hook that wires the AccentColourSettings component to the
 * /api/user/accent-colour endpoint.
 *
 * Usage in a settings page:
 *
 *   const { currentColourId, saveAccentColour } = useAccentColour(initialId);
 *   <AccentColourSettings currentColourId={currentColourId} onSave={saveAccentColour} />
 */
export function useAccentColour(initialId: string = "blue") {
  const [currentColourId, setCurrentColourId] = useState(initialId);

  const saveAccentColour = useCallback(async (colourId: string) => {
    // Optimistically apply
    applyAccentColour(colourId);
    setCurrentColourId(colourId);

    const res = await fetch("/api/user/accent-colour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colourId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to save accent colour");
    }

    // Also keep localStorage in sync for unauthenticated / fast-load path
    localStorage.setItem("accent-colour", colourId);
  }, []);

  return { currentColourId, saveAccentColour };
}
