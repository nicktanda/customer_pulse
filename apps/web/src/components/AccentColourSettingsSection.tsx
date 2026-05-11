'use client';

import React, { useState, useTransition } from 'react';
import { AccentColourPicker } from './AccentColourPicker';
import { useAccentColourContext } from './AccentColourProvider';

interface AccentColourSettingsSectionProps {
  /** Server action or API call to persist the value. */
  onSave?: (hex: string) => Promise<void>;
  /** Feature flag forwarded from server. */
  enabled?: boolean;
}

export function AccentColourSettingsSection({
  onSave,
  enabled = true,
}: AccentColourSettingsSectionProps) {
  const { accent, setAccent } = useAccentColourContext();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(hex: string) {
    setAccent(hex);
    setSaved(false);
    setError(null);
  }

  function handleSave() {
    if (!onSave) return;
    setError(null);
    startTransition(async () => {
      try {
        await onSave(accent);
        setSaved(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to save preference.',
        );
      }
    });
  }

  return (
    <section
      aria-labelledby="accent-colour-heading"
      style={{
        padding: '20px 0',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <h3
        id="accent-colour-heading"
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 4,
          color: '#111827',
        }}
      >
        Accent colour
      </h3>
      <p
        style={{
          fontSize: 14,
          color: '#6b7280',
          marginBottom: 16,
        }}
      >
        Choose your highlight colour. It will be applied to buttons, active
        states, and focus rings throughout the app.
      </p>

      <AccentColourPicker
        value={accent}
        onChange={handleChange}
        disabled={!enabled}
      />

      {onSave && (
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !enabled}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: 'none',
              background: enabled
                ? 'var(--color-accent, #6366f1)'
                : '#d1d5db',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: pending || !enabled ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Saving…' : 'Save'}
          </button>

          {saved && (
            <span
              role="status"
              style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}
            >
              ✓ Saved
            </span>
          )}

          {error && (
            <span
              role="alert"
              style={{ fontSize: 13, color: '#dc2626' }}
            >
              {error}
            </span>
          )}
        </div>
      )}

      {!enabled && (
        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#9ca3af',
            fontStyle: 'italic',
          }}
        >
          Accent colour customisation is not yet available on your account.
        </p>
      )}
    </section>
  );
}
