import React from 'react';
import { ACCENT_COLOURS, AccentColourId } from '../lib/accentColour';

interface AccentColourPickerProps {
  selected: AccentColourId;
  onChange: (id: AccentColourId) => void;
}

export function AccentColourPicker({ selected, onChange }: AccentColourPickerProps) {
  return (
    <div className="accent-colour-picker">
      <p className="accent-colour-picker__label">Accent Colour</p>
      <div className="accent-colour-picker__swatches" role="radiogroup" aria-label="Choose accent colour">
        {ACCENT_COLOURS.map((colour) => {
          const isSelected = colour.id === selected;
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colour.label}
              title={colour.label}
              className={`accent-colour-picker__swatch${
                isSelected ? ' accent-colour-picker__swatch--selected' : ''
              }`}
              style={{ backgroundColor: colour.value }}
              onClick={() => onChange(colour.id as AccentColourId)}
            >
              {isSelected && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="accent-colour-picker__check"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
