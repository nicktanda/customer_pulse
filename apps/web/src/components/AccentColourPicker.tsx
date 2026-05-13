'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ACCENT_COLOURS,
  applyAccentColour,
  getAccentColourById,
  persistAccentId,
  readPersistedAccentId,
} from '../lib/accentColour';

interface AccentColourPickerProps {
  /** Called after user picks a colour so parent can sync to server if needed */
  onChange?: (accentId: string) => void;
  /** Pre-selected accent id (e.g. loaded from the user's server-side profile) */
  initialAccentId?: string;
}

export default function AccentColourPicker({
  onChange,
  initialAccentId,
}: AccentColourPickerProps) {
  const [selected, setSelected] = useState<string>(
    initialAccentId ?? DEFAULT_ACCENT_ID_PLACEHOLDER
  );

  // Hydrate from localStorage on mount if no server value was provided
  useEffect(() => {
    if (!initialAccentId) {
      const persisted = readPersistedAccentId();
      setSelected(persisted);
    }
  }, [initialAccentId]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelected(id);
      applyAccentColour(id);
      persistAccentId(id);
      onChange?.(id);
    },
    [onChange]
  );

  return (
    <div className="accent-picker">
      <p className="accent-picker__label">Accent colour</p>
      <div className="accent-picker__swatches" role="radiogroup" aria-label="Choose accent colour">
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
              className={`accent-picker__swatch${
                isSelected ? ' accent-picker__swatch--selected' : ''
              }`}
              style={{ backgroundColor: colour.value }}
              onClick={() => handleSelect(colour.id)}
            >
              {isSelected && (
                <svg
                  className="accent-picker__check"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <p className="accent-picker__hint">
        Preview:{' '}
        <span
          className="accent-picker__preview-badge"
          style={{
            backgroundColor: getAccentColourById(selected).value,
            color: getAccentColourById(selected).onAccent,
          }}
        >
          {getAccentColourById(selected).label}
        </span>
      </p>
    </div>
  );
}

// Avoid importing DEFAULT_ACCENT_ID at module evaluation time to keep
// the constant co-located with the logic.
const DEFAULT_ACCENT_ID_PLACEHOLDER = 'indigo';
