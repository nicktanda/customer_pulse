'use client';

import React, { useTransition } from 'react';
import { AccentColorPicker } from '@/components/accent-color-picker';
import { useAccentColor } from '@/components/accent-color-provider';
import { saveAccentColorAction } from './accent-color-action';

interface AccentColorSectionProps {
  userId: string;
  initialColor?: string | null;
  featureEnabled?: boolean;
}

export function AccentColorSection({
  userId,
  initialColor,
  featureEnabled = false,
}: AccentColorSectionProps) {
  const { accentColor, setAccentColor } = useAccentColor();
  const [, startTransition] = useTransition();

  if (!featureEnabled) return null;

  const handleChange = async (hex: string) => {
    // Snapshot the previous colour so we can roll back on failure.
    const previousColor = accentColor;

    // Optimistically update the UI.
    setAccentColor(hex);

    // Persist via server action and roll back on failure.
    startTransition(async () => {
      try {
        const result = await saveAccentColorAction({ userId, accentColor: hex });
        if (!result.success) {
          // Roll back the optimistic update.
          setAccentColor(previousColor);
          console.error(
            '[AccentColor] Failed to save preference:',
            result.error,
          );
        }
      } catch (err) {
        // Roll back the optimistic update.
        setAccentColor(previousColor);
        console.error('[AccentColor] Failed to save preference:', err);
      }
    });
  };

  return (
    <section aria-labelledby="accent-color-heading">
      <h2
        id="accent-color-heading"
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          marginBottom: '4px',
          color: '#111827',
        }}
      >
        Appearance
      </h2>
      <p
        style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          marginBottom: '16px',
          marginTop: 0,
        }}
      >
        Choose an accent colour used for buttons, highlights, and active
        states across the app.
      </p>
      <AccentColorPicker value={accentColor} onChange={handleChange} />
    </section>
  );
}
