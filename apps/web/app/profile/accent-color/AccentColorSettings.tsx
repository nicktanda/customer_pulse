"use client";

import React from "react";
import { AccentColorPicker } from "../../../components/AccentColorPicker";
import { useAccentColor } from "../../../hooks/useAccentColor";

interface AccentColorSettingsProps {
  initialValue?: string | null;
}

/**
 * Client island that wires up the hook and the picker component.
 * Kept separate from the Server Component page so that data-fetching
 * and the interactive UI are cleanly separated.
 */
export default function AccentColorSettings({
  initialValue,
}: AccentColorSettingsProps) {
  const { accentColor, setAccentColor, saveAccentColor, isSaving, saveError } =
    useAccentColor(initialValue);

  return (
    <AccentColorPicker
      value={accentColor}
      onChange={setAccentColor}
      onSave={saveAccentColor}
      isSaving={isSaving}
      saveError={saveError}
    />
  );
}
