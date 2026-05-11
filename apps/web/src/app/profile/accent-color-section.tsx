'use client';

import React, { useRef, useTransition } from 'react';
import { AccentColorPicker } from '@/components/accent-color-picker';
import { useAccentColor } from '@/components/accent-color-provider';
import { saveAccentColorAction } from './accent-color-action';

interface AccentColorSectionProps {
  userId: string;
  featureEnabled?: boolean;
}

export function AccentColorSection({
  userId,
  featureEnabled = false,
}: AccentColorSectionProps) {
  const { accentColor, setAccentColor } = useAccentColor();
  const [, startTransition] = useTransition();

  // Track the last committed (successfully saved or initial) colour using a
  // ref so rapid clicks always roll back to the true last-committed value
  // rather than an intermediate optimistic value.
  const committedColorRef = useRef<string>(accentColor);

  /**
   * Optimistically updates the accent colour and persists via server action.
   * The update is fire-and-forget from the caller's perspective; rollback
   * on failure happens inside the startTransition callback.
   */
  const handleColorChange = (hex: string) => {
    // Snapshot the last committed colour for rollback.
    const previousCommitted = committedColorRef.current;

    // Optimistically update the UI.
    setAccentColor(hex);

    // Persist via server action and roll back on failure.
    startTransition(async () => {
      try {
        const result = await saveAccentColorAction({ userId, accentColor: hex });
        if (!result.success) {
          // Roll back to the last committed colour.
          setAccentColor(previousCommitted);
          console.error(
            '[AccentColor] Failed to save preference:',
            result.error,
          );
        } else {
          // Advance the committed ref to the newly saved colour.
          committedColorRef.current = hex;
        }
      } catch (err) {
        // Roll back to the last committed colour.
        setAccentColor(previousCommitted);
        console.error('[AccentColor] Failed to save preference:', err);
      }
    });
  };

  if (!featureEnabled) return null;

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
      <AccentColorPicker value={accentColor} onChange={handleColorChange} />
    </section>
  );
}
