import React from 'react';
import { ACCENT_COLOURS, AccentColourId, useAccentColour } from '../hooks/useAccentColour';

interface AccentColourPickerProps {
  /** Optional: allow parent to control the value (e.g. from a server-persisted preference) */
  value?: AccentColourId;
  onChange?: (id: AccentColourId) => void;
}

export function AccentColourPicker({ value, onChange }: AccentColourPickerProps) {
  const { accentId, setAccent } = useAccentColour();
  const activeId = value ?? accentId;

  const handleSelect = (id: AccentColourId) => {
    setAccent(id);
    onChange?.(id);
  };

  return (
    <div className="accent-colour-picker">
      <p className="accent-colour-picker__label">Accent colour</p>
      <div className="accent-colour-picker__swatches" role="radiogroup" aria-label="Accent colour">
        {ACCENT_COLOURS.map((colour) => (
          <button
            key={colour.id}
            type="button"
            role="radio"
            aria-checked={activeId === colour.id}
            aria-label={colour.label}
            title={colour.label}
            className={[
              'accent-colour-picker__swatch',
              activeId === colour.id ? 'accent-colour-picker__swatch--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--swatch-colour': colour.value } as React.CSSProperties}
            onClick={() => handleSelect(colour.id)}
          />
        ))}
      </div>
    </div>
  );
}
