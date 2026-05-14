"use client";

import React, { useEffect, useState } from "react";
import {
  ACCENT_COLOURS,
  DEFAULT_ACCENT_ID,
  applyAccentColour,
  loadPersistedAccent,
  persistAccent,
} from "../lib/accentColour";

export default function AccentColourPicker() {
  const [selected, setSelected] = useState<string>(DEFAULT_ACCENT_ID);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadPersistedAccent();
    setSelected(saved);
    applyAccentColour(saved);
  }, []);

  function handleSelect(id: string) {
    setSelected(id);
    persistAccent(id);
    applyAccentColour(id);
  }

  return (
    <div className="accent-picker">
      <p className="accent-picker__label">Accent colour</p>
      <div className="accent-picker__swatches">
        {ACCENT_COLOURS.map((colour) => (
          <button
            key={colour.id}
            type="button"
            className={`accent-picker__swatch${
              selected === colour.id ? " accent-picker__swatch--active" : ""
            }`}
            style={{ backgroundColor: colour.hex }}
            aria-label={`${colour.label}${
              selected === colour.id ? " (selected)" : ""
            }`}
            aria-pressed={selected === colour.id}
            title={colour.label}
            onClick={() => handleSelect(colour.id)}
          />
        ))}
      </div>
    </div>
  );
}
