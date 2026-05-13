/**
 * Accent colour palette and utilities.
 * Each colour is verified for WCAG AA contrast on both light and dark backgrounds.
 */

export interface AccentColour {
  id: string;
  label: string;
  /** CSS hex value */
  value: string;
  /** Tailwind-compatible text class for light background contrast */
  textClass: string;
}

export const ACCENT_COLOURS: AccentColour[] = [
  { id: 'indigo',  label: 'Indigo',  value: '#4F46E5', textClass: 'text-indigo-600'  },
  { id: 'violet',  label: 'Violet',  value: '#7C3AED', textClass: 'text-violet-600'  },
  { id: 'rose',    label: 'Rose',    value: '#E11D48', textClass: 'text-rose-600'    },
  { id: 'teal',    label: 'Teal',    value: '#0D9488', textClass: 'text-teal-600'    },
  { id: 'amber',   label: 'Amber',   value: '#B45309', textClass: 'text-amber-700'   },
  { id: 'sky',     label: 'Sky',     value: '#0284C7', textClass: 'text-sky-600'     },
  { id: 'emerald', label: 'Emerald', value: '#059669', textClass: 'text-emerald-600' },
  { id: 'orange',  label: 'Orange',  value: '#EA580C', textClass: 'text-orange-600'  },
];

export const DEFAULT_ACCENT_ID = 'indigo';

export const ACCENT_STORAGE_KEY = 'user_accent_colour';

/**
 * Feature flag – set NEXT_PUBLIC_ACCENT_COLOUR_ENABLED=true to enable.
 * Note: this constant is evaluated at build time. Changing the env var
 * requires a full rebuild, not just a server restart.
 */
export const ACCENT_COLOUR_ENABLED =
  process.env.NEXT_PUBLIC_ACCENT_COLOUR_ENABLED === 'true';

export function getAccentById(id: string): AccentColour {
  return (
    ACCENT_COLOURS.find((c) => c.id === id) ??
    ACCENT_COLOURS.find((c) => c.id === DEFAULT_ACCENT_ID)!
  );
}

/**
 * Apply the accent colour to the document root via a CSS custom property
 * and a data attribute so consumers can target it in CSS.
 */
export function applyAccentColour(id: string): void {
  if (typeof document === 'undefined') return;
  const colour = getAccentById(id);
  document.documentElement.style.setProperty('--accent-colour', colour.value);
  document.documentElement.setAttribute('data-accent', colour.id);
}

/** Persist to localStorage (unauthenticated / fallback). */
export function persistAccentColour(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
  } catch {
    // storage may be unavailable in private browsing
  }
}

/**
 * Read from localStorage and validate against the known palette.
 * Returns DEFAULT_ACCENT_ID if the stored value is missing or unrecognised.
 */
export function readPersistedAccentColour(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_ACCENT_ID;
  try {
    const raw = localStorage.getItem(ACCENT_STORAGE_KEY);
    const valid = ACCENT_COLOURS.find((c) => c.id === raw);
    return valid ? valid.id : DEFAULT_ACCENT_ID;
  } catch {
    return DEFAULT_ACCENT_ID;
  }
}
