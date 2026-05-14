"use client";

import { useState, useTransition } from "react";
import { ACCENT_COLOURS, type AccentColour } from "./accent-colours";
import { applyAccentColour } from "./accent-colour-utils";

interface AccentColourPickerProps {
  currentColour?: string;
  onSave?: (colourId: string) => Promise<void>;
}

export function AccentColourPicker({
  currentColour,
  onSave,
}: AccentColourPickerProps) {
  const [selected, setSelected] = useState<string>(
    currentColour ?? "blue"
  );
  const [isPending, startTransition] = useTransition();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSelect = (colour: AccentColour) => {
    setSelected(colour.id);
    applyAccentColour(colour.id);
    setSavedMessage(null);

    startTransition(async () => {
      try {
        if (onSave) {
          await onSave(colour.id);
        } else {
          localStorage.setItem("accent-colour", colour.id);
        }
        setSavedMessage("Saved");
        setTimeout(() => setSavedMessage(null), 2000);
      } catch {
        setSavedMessage("Failed to save");
      }
    });
  };

  return (
    <div className="accent-colour-picker">
      <div className="accent-colour-picker__swatches" role="radiogroup" aria-label="Accent colour">
        {ACCENT_COLOURS.map((colour) => {
          const isSelected = selected === colour.id;
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colour.label}
              title={colour.label}
              className={`accent-colour-picker__swatch${
                isSelected ? " accent-colour-picker__swatch--selected" : ""
              }`}
              style={{ "--swatch-colour": colour.value } as React.CSSProperties}
              onClick={() => handleSelect(colour)}
              disabled={isPending}
            />
          );
        })}
      </div>
      {savedMessage && (
        <p className="accent-colour-picker__status" aria-live="polite">
          {savedMessage}
        </p>
      )}
    </div>
  );
}
