'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { isAccentColourPickerEnabled } from '../lib/accentColour';
import './AccentColourPicker.css';

const AccentColourPicker = dynamic(() => import('./AccentColourPicker'), {
  ssr: false,
});

interface UserPreferencesAppearanceProps {
  /** Current accent id loaded from the user's profile (server-provided) */
  savedAccentId?: string;
  /** Called when the user picks a new accent so it can be persisted server-side */
  onAccentChange?: (accentId: string) => void;
}

/**
 * 'Appearance' section for the user preferences / settings panel.
 *
 * Gated behind the NEXT_PUBLIC_ACCENT_COLOUR_PICKER feature flag.
 * When the flag is off this component renders nothing, keeping the
 * settings UI unchanged for users in the control group.
 */
export default function UserPreferencesAppearance({
  savedAccentId,
  onAccentChange,
}: UserPreferencesAppearanceProps) {
  if (!isAccentColourPickerEnabled()) {
    return null;
  }

  return (
    <section className="pref-section" aria-labelledby="pref-appearance-heading">
      <h2 id="pref-appearance-heading" className="pref-section__title">
        Appearance
      </h2>
      <p className="pref-section__description">
        Customise the accent colour used throughout the interface.
      </p>
      <AccentColourPicker
        initialAccentId={savedAccentId}
        onChange={onAccentChange}
      />
    </section>
  );
}
