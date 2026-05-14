"use client";

import "./accent-colour.css";
import { AccentColourPicker } from "./AccentColourPicker";

interface AccentColourSettingsProps {
  currentColourId?: string;
  onSave?: (colourId: string) => Promise<void>;
}

/**
 * Drop-in "Appearance" section for any settings / preferences page.
 *
 * Usage:
 *   <AccentColourSettings currentColourId={user.accentColour} onSave={saveAccentColour} />
 */
export function AccentColourSettings({
  currentColourId,
  onSave,
}: AccentColourSettingsProps) {
  return (
    <section className="accent-colour-settings">
      <h3 className="accent-colour-settings__heading">Appearance</h3>
      <p className="accent-colour-settings__description">
        Choose an accent colour to personalise your interface.
      </p>
      <AccentColourPicker currentColour={currentColourId} onSave={onSave} />
    </section>
  );
}
