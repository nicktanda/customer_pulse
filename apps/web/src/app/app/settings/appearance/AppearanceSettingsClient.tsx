"use client";

import "@/components/accent-colour/accent-colour.css";
import { AccentColourSettings } from "@/components/accent-colour/AccentColourSettings";
import { useAccentColour } from "@/components/accent-colour/useAccentColour";
import { useEffect } from "react";
import { applyAccentColour } from "@/components/accent-colour/accent-colour-utils";

interface Props {
  initialColourId: string;
}

export function AppearanceSettingsClient({ initialColourId }: Props) {
  const { currentColourId, saveAccentColour } = useAccentColour(initialColourId);

  // Apply on mount so the page always reflects the stored choice
  useEffect(() => {
    applyAccentColour(initialColourId);
  }, [initialColourId]);

  return (
    <AccentColourSettings
      currentColourId={currentColourId}
      onSave={saveAccentColour}
    />
  );
}
