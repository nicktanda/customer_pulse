'use client';

import React from 'react';
import { AccentColourPicker } from '../../../components/AccentColourPicker';

export default function AppearanceSettingsPage() {
  return (
    <div style={{ maxWidth: '480px', padding: '2rem' }}>
      <h2 style={{ marginTop: 0 }}>Appearance</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Personalise the look of the app. Your choices are saved to this browser.
      </p>

      <section
        style={{
          background: 'var(--bs-body-bg, #fff)',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.25rem',
        }}
      >
        <AccentColourPicker />
      </section>
    </div>
  );
}
