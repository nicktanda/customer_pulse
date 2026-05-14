"use client";

import React from "react";
import { ACCENT_COLOURS } from "@/lib/accentColour";
import { useAccentColour } from "@/components/AccentColourProvider";

export function AccentColourPicker() {
  const { accent, setAccentById } = useAccentColour();

  return (
    <div>
      <div className="d-flex flex-wrap gap-3">
        {ACCENT_COLOURS.map((colour) => {
          const isSelected = colour.id === accent.id;
          return (
            <button
              key={colour.id}
              type="button"
              title={colour.label}
              aria-label={`Set accent colour to ${colour.label}${
                isSelected ? " (currently selected)" : ""
              }`}
              aria-pressed={isSelected}
              onClick={() => setAccentById(colour.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: colour.value,
                border: isSelected
                  ? `3px solid ${colour.value}`
                  : "3px solid transparent",
                outline: isSelected ? `2px solid #fff` : "2px solid transparent",
                boxShadow: isSelected
                  ? `0 0 0 3px ${colour.value}, 0 2px 6px rgba(0,0,0,0.25)`
                  : "0 1px 3px rgba(0,0,0,0.2)",
                cursor: "pointer",
                padding: 0,
                transition: "box-shadow 0.15s ease, outline 0.15s ease",
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      <p className="text-muted mt-2 mb-0" style={{ fontSize: "0.8rem" }}>
        Selected:{" "}
        <span
          className="fw-semibold"
          style={{ color: accent.value }}
        >
          {accent.label}
        </span>
        . Changes are saved automatically and applied across the entire app.
      </p>
    </div>
  );
}
