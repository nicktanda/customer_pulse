"use client";

import React from "react";
import { useAccentColour } from "./AccentColourContext";
import { ACCENT_PALETTE, AccentColourKey } from "./accent-palette";

export function AccentColourPicker() {
  const { accent, setAccent } = useAccentColour();

  return (
    <div className="accent-colour-picker">
      <p className="accent-colour-picker__label">Accent colour</p>
      <div className="accent-colour-picker__swatches" role="radiogroup" aria-label="Choose accent colour">
        {ACCENT_PALETTE.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="radio"
            aria-checked={accent === entry.key}
            aria-label={entry.label}
            title={entry.label}
            className={[
              "accent-colour-picker__swatch",
              accent === entry.key ? "accent-colour-picker__swatch--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ backgroundColor: entry.value }}
            onClick={() => setAccent(entry.key as AccentColourKey)}
          />
        ))}
      </div>
      <p className="accent-colour-picker__hint">
        Applied to buttons, links, and interactive elements across the app.
      </p>
    </div>
  );
}
