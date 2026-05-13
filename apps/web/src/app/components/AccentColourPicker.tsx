"use client";

import React from "react";
import {
  ACCENT_PALETTE,
  AccentColour,
  useAccentColour,
} from "./AccentColourProvider";

export default function AccentColourPicker() {
  const { accent, setAccent } = useAccentColour();

  return (
    <div className="accent-colour-picker">
      <p className="accent-colour-picker__label">Accent colour</p>
      <div className="accent-colour-picker__swatches" role="radiogroup" aria-label="Accent colour">
        {ACCENT_PALETTE.map((entry) => {
          const isSelected = accent === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={entry.label}
              title={`${entry.label} — ${entry.a11y}`}
              className={[
                "accent-colour-picker__swatch",
                isSelected ? "accent-colour-picker__swatch--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--swatch-colour": entry.swatch } as React.CSSProperties}
              onClick={() => setAccent(entry.id as AccentColour)}
            />
          );
        })}
      </div>
      <p className="accent-colour-picker__hint">
        Changes are saved automatically.
      </p>
    </div>
  );
}
