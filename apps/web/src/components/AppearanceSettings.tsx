'use client';

import React from 'react';
import { AccentColourPicker } from './AccentColourPicker';
import { ACCENT_COLOUR_ENABLED } from '@/lib/accentColour';

/**
 * Appearance section rendered inside the user preferences / settings screen.
 * Drop this into whatever settings page component already exists.
 */
export function AppearanceSettings() {
  if (!ACCENT_COLOUR_ENABLED) return null;

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="py-6 px-4 sm:px-6">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personalise how the app looks for you.
        </p>
      </div>

      <div className="py-6 px-4 sm:px-6">
        <AccentColourPicker />
      </div>
    </div>
  );
}
