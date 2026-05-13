/**
 * Accent colour configuration and utilities.
 * Colours are WCAG AA compliant (≥4.5:1 contrast ratio on white/dark backgrounds).
 */

export interface AccentColour {
  id: string;
  label: string;
  /** CSS custom property value */
  value: string;
  /** Darker shade for hover/active states */
  valueDark: string;
  /** Text colour to use on top of the accent (for buttons etc.) */
  onAccent: string;
}

export const ACCENT_COLOURS: AccentColour[] = [
  {
    id: 'indigo',
    label: 'Indigo',
    value: '#4F46E5',
    valueDark: '#3730A3',
    onAccent: '#FFFFFF',
  },
  {
    id: 'violet',
    label: 'Violet',
    value: '#7C3AED',
    valueDark: '#5B21B6',
    onAccent: '#FFFFFF',
  },
  {
    id: 'rose',
    label: 'Rose',
    value: '#BE123C',
    valueDark: '#9F1239',
    onAccent: '#FFFFFF',
  },
  {
    id: 'teal',
    label: 'Teal',
    value: '#0F766E',
    valueDark: '#0D5D5A',
    onAccent: '#FFFFFF',
  },
  {
    id: 'blue',
    label: 'Blue',
    value: '#1D4ED8',
    valueDark: '#1E40AF',
    onAccent: '#FFFFFF',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    value: '#047857',
    valueDark: '#065F46',
    onAccent: '#FFFFFF',
  },
  {
    id: 'amber',
    label: 'Amber',
    value: '#B45309',
    valueDark: '#92400E',
    onAccent: '#FFFFFF',
  },
  {
    id: 'slate',
    label: 'Slate',
    value: '#334155',
    valueDark: '#1E293B',
    onAccent: '#FFFFFF',
  },
];

export const DEFAULT_ACCENT_ID = 'indigo';

export const LOCAL_STORAGE_KEY = 'accent-colour';

export const FEATURE_FLAG_KEY = 'NEXT_PUBLIC_ACCENT_COLOUR_PICKER';

/**
 * Returns true when the accent colour picker feature flag is enabled.
 * Set NEXT_PUBLIC_ACCENT_COLOUR_PICKER=true in your environment to enable.
 */
export function isAccentColourPickerEnabled(): boolean {
  if (typeof process !== 'undefined') {
    return process.env.NEXT_PUBLIC_ACCENT_COLOUR_PICKER === 'true';
  }
  return false;
}

export function getAccentColourById(id: string): AccentColour {
  return (
    ACCENT_COLOURS.find((c) => c.id === id) ??
    ACCENT_COLOURS.find((c) => c.id === DEFAULT_ACCENT_ID)!
  );
}

/**
 * Applies accent colour CSS custom properties to the document root.
 * Safe to call only in browser context.
 */
export function applyAccentColour(id: string): void {
  if (typeof document === 'undefined') return;
  const colour = getAccentColourById(id);
  const root = document.documentElement;
  root.setAttribute('data-accent', colour.id);
  root.style.setProperty('--accent', colour.value);
  root.style.setProperty('--accent-dark', colour.valueDark);
  root.style.setProperty('--accent-on', colour.onAccent);
}

/**
 * Reads the persisted accent colour id from localStorage.
 * Falls back to DEFAULT_ACCENT_ID when not found.
 */
export function readPersistedAccentId(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_ACCENT_ID;
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) ?? DEFAULT_ACCENT_ID;
  } catch {
    return DEFAULT_ACCENT_ID;
  }
}

/**
 * Persists the accent colour id to localStorage.
 */
export function persistAccentId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, id);
  } catch {
    // localStorage may be unavailable (private mode, storage quota, etc.)
  }
}
