'use client';

import React, { useState, useEffect } from 'react';
import { AccentColourPicker } from './AccentColourPicker';
import './AppearanceSettings.css';
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

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function handleChange(id: AccentColourId) {
    setAccentColour(id);
    saveAccentColour(id);
    setSaved(true);
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
        <p className="appearance-settings__saved" role="status" aria-live="polite">
          {saved ? '✓ Saved' : ''}
        </p>
      </div>
    </section>
  );
}
