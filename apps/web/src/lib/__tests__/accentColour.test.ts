import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ACCENT_COLOURS,
  DEFAULT_ACCENT_ID,
  LOCAL_STORAGE_KEY,
  getAccentColourById,
  applyAccentColour,
  readPersistedAccentId,
  persistAccentId,
  isAccentColourPickerEnabled,
} from '../accentColour';

describe('getAccentColourById', () => {
  it('returns the matching colour entry', () => {
    const colour = getAccentColourById('indigo');
    expect(colour.id).toBe('indigo');
    expect(colour.value).toBe('#4F46E5');
  });

  it('falls back to the default accent when id is unknown', () => {
    const colour = getAccentColourById('unknown-id');
    expect(colour.id).toBe(DEFAULT_ACCENT_ID);
  });

  it('returns an entry for every id in ACCENT_COLOURS', () => {
    for (const entry of ACCENT_COLOURS) {
      expect(getAccentColourById(entry.id).id).toBe(entry.id);
    }
  });
});

describe('applyAccentColour', () => {
  it('does nothing when document is undefined', () => {
    // In a Node/vitest environment document is not defined by default.
    // applyAccentColour should silently return.
    expect(() => applyAccentColour('indigo')).not.toThrow();
  });
});

describe('readPersistedAccentId', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  it('returns DEFAULT_ACCENT_ID when localStorage has no entry', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(readPersistedAccentId()).toBe(DEFAULT_ACCENT_ID);
  });

  it('returns the stored value when present', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('rose');
    expect(readPersistedAccentId()).toBe('rose');
  });
});

describe('persistAccentId', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  it('calls localStorage.setItem with the correct key and id', () => {
    persistAccentId('teal');
    expect(localStorage.setItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY, 'teal');
  });
});

describe('isAccentColourPickerEnabled', () => {
  it('returns false when the env var is not set to "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_ACCENT_COLOUR_PICKER', 'false');
    expect(isAccentColourPickerEnabled()).toBe(false);
  });

  it('returns true when the env var is "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_ACCENT_COLOUR_PICKER', 'true');
    expect(isAccentColourPickerEnabled()).toBe(true);
  });
});
