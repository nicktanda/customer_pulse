import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ACCENT_COLOURS,
  DEFAULT_ACCENT_ID,
  ACCENT_STORAGE_KEY,
  getAccentById,
  applyAccentColour,
  persistAccentColour,
  readPersistedAccentColour,
} from '../accentColour';

describe('getAccentById', () => {
  it('returns the matching accent for a known id', () => {
    const colour = getAccentById('rose');
    expect(colour.id).toBe('rose');
    expect(colour.value).toBe('#E11D48');
  });

  it('falls back to the default accent for an unknown id', () => {
    const colour = getAccentById('not-a-real-colour');
    expect(colour.id).toBe(DEFAULT_ACCENT_ID);
  });

  it('returns each accent in the palette by id', () => {
    for (const accent of ACCENT_COLOURS) {
      expect(getAccentById(accent.id).id).toBe(accent.id);
    }
  });
});

describe('persistAccentColour / readPersistedAccentColour', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and reads back a valid accent id', () => {
    persistAccentColour('teal');
    expect(readPersistedAccentColour()).toBe('teal');
  });

  it('returns the default when nothing is stored', () => {
    expect(readPersistedAccentColour()).toBe(DEFAULT_ACCENT_ID);
  });

  it('returns the default when an unrecognised id is stored', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, 'not-a-colour');
    expect(readPersistedAccentColour()).toBe(DEFAULT_ACCENT_ID);
  });

  it('returns the default when an empty string is stored', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, '');
    expect(readPersistedAccentColour()).toBe(DEFAULT_ACCENT_ID);
  });
});

describe('applyAccentColour', () => {
  it('sets the --accent-colour CSS custom property on the document root', () => {
    applyAccentColour('violet');
    const value = document.documentElement.style.getPropertyValue('--accent-colour');
    expect(value).toBe('#7C3AED');
  });

  it('sets the data-accent attribute on the document root', () => {
    applyAccentColour('sky');
    expect(document.documentElement.getAttribute('data-accent')).toBe('sky');
  });

  it('falls back to the default colour for an unknown id', () => {
    applyAccentColour('unknown');
    const value = document.documentElement.style.getPropertyValue('--accent-colour');
    const defaultColour = ACCENT_COLOURS.find((c) => c.id === DEFAULT_ACCENT_ID)!;
    expect(value).toBe(defaultColour.value);
  });
});
