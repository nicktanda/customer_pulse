'use client';

import React from 'react';
import { ACCENT_COLOURS, ACCENT_COLOUR_ENABLED } from '@/lib/accentColour';
import { useAccentColour } from './AccentColourProvider';

export function AccentColourPicker() {
  const { accentId, setAccentId } = useAccentColour();

  if (!ACCENT_COLOUR_ENABLED) return null;

  return (
    <section aria-labelledby="accent-colour-heading">
      <h3
        id="accent-colour-heading"
        className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3"
      >
        Accent Colour
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Choose a highlight colour applied to buttons and interactive elements.
      </p>
      <div
        role="radiogroup"
        aria-label="Accent colour options"
        className="flex flex-wrap gap-3"
      >
        {ACCENT_COLOURS.map((colour) => {
          const isSelected = colour.id === accentId;
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colour.label}
              title={colour.label}
              onClick={() => setAccentId(colour.id)}
              className={
                [
                  'w-8 h-8 rounded-full border-2 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-gray-900 dark:border-white scale-110 shadow-md'
                    : 'border-transparent hover:scale-105',
                ].join(' ')
              }
              style={{ backgroundColor: colour.value }}
            >
              {isSelected && (
                <span className="flex items-center justify-center w-full h-full">
                  <svg
                    viewBox="0 0 12 12"
                    className="w-3 h-3 text-white drop-shadow"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="1.5,6 4.5,9.5 10.5,2.5" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
