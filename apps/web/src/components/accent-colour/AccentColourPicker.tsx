'use client';

import { ACCENT_COLOURS } from '@/lib/accent-colour';
import { useAccentColour } from './AccentColourProvider';
import styles from './AccentColourPicker.module.css';

export function AccentColourPicker() {
  const { accent, setAccent } = useAccentColour();

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Accent Colour</h3>
      <p className={styles.description}>
        Choose an accent colour for buttons, links, and interactive elements.
      </p>
      <div className={styles.palette} role="radiogroup" aria-label="Accent colour">
        {ACCENT_COLOURS.map((colour) => {
          const isSelected = accent === colour.id;
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colour.label}
              title={colour.label}
              className={`${styles.swatch} ${isSelected ? styles.selected : ''}`}
              style={{
                '--swatch-colour': colour.value,
              } as React.CSSProperties}
              onClick={() => setAccent(colour.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
