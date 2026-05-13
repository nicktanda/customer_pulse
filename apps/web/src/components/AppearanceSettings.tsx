'use client';

import React, { useState, useEffect } from 'react';
import { AccentColourPicker } from './AccentColourPicker';
import './AccentColourPicker.css';
import {
  AccentColourId,
  DEFAULT_ACCENT_COLOUR_ID,
  loadAccentColour,
  saveAccentColour,
} from '../lib/accentColour';

export function AppearanceSettings() {
  const [accentColour, setAccentColour] = useState<AccentColourId>(DEFAULT_ACCENT_COLOUR_ID);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAccentColour(loadAccentColour());
  }, []);

  function handleChange(id: AccentColourId) {
    setAccentColour(id);
    saveAccentColour(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="appearance-settings" aria-labelledby="appearance-settings-heading">
      <h2 id="appearance-settings-heading" className="appearance-settings__heading">
        Appearance
      </h2>
      <p className="appearance-settings__description">
        Personalise the look of the app by choosing an accent colour that applies to buttons,
        links, and other interactive elements.
      </p>

      <div className="appearance-settings__field">
        <AccentColourPicker selected={accentColour} onChange={handleChange} />
        {saved && (
          <p className="appearance-settings__saved" role="status" aria-live="polite">
            ✓ Saved
          </p>
        )}
      </div>
    </section>
  );
}
