"use client";

import { useCallback, useState } from "react";
import { applyAccentColour } from "./accent-colour-utils";
import { ACCENT_COLOUR_STORAGE_KEY } from "./accent-colours";

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
    // Remember previous state so we can roll back on failure
    const previousColourId = currentColourId;

    // Optimistically apply
    applyAccentColour(colourId);
    setCurrentColourId(colourId);

    try {
      const res = await fetch("/api/user/accent-colour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colourId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Roll back on failure
        applyAccentColour(previousColourId);
        setCurrentColourId(previousColourId);
        throw new Error((err as { error?: string }).error ?? "Failed to save accent colour");
      }

      // Also keep localStorage in sync for unauthenticated / fast-load path
      localStorage.setItem(ACCENT_COLOUR_STORAGE_KEY, colourId);
    } catch (err) {
      // Roll back if the fetch itself threw (network error, etc.)
      if (err instanceof Error && err.message !== "Failed to save accent colour") {
        applyAccentColour(previousColourId);
        setCurrentColourId(previousColourId);
      }
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentColourId]);

  return { currentColourId, saveAccentColour };
}
