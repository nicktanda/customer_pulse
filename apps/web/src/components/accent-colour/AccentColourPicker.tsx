"use client";

import React from "react";
import { ACCENT_COLOURS } from "./accent-colours";
import { useAccentColour } from "./accent-colour-context";

export function AccentColourPicker() {
  const { accent, setAccentId } = useAccentColour();

  return (
    <div className="mb-4">
      <label className="form-label fw-semibold mb-2 d-block">
        Accent Colour
      </label>
      <div
        className="d-flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Choose accent colour"
      >
        {ACCENT_COLOURS.map((colour) => (
          <button
            key={colour.id}
            type="button"
            role="radio"
            aria-checked={accent.id === colour.id}
            aria-label={colour.label}
            title={colour.label}
            className={`accent-swatch${accent.id === colour.id ? " selected" : ""}`}
            style={{
              backgroundColor: colour.hex,
              color: colour.hex,
            }}
            onClick={() => setAccentId(colour.id)}
          />
        ))}
      </div>
      <p className="form-text mt-2">
        Selected:{" "}
        <span className="fw-medium" style={{ color: accent.hex }}>
          {accent.label}
        </span>
      </p>
    </div>
  );
}
