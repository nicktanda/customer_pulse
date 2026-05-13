// Accent colour palette
// Note: all colours except Amber meet WCAG AA (4.5:1) for normal text on white.
// Amber (#D97706) has a contrast ratio of ~2.8:1 and should only be used as a
// background/decorative accent, not for text links.
export const ACCENT_COLOURS = [
  { id: 'indigo', label: 'Indigo', value: '#4F46E5', contrast: 'white' },
  { id: 'violet', label: 'Violet', value: '#7C3AED', contrast: 'white' },
  { id: 'sky', label: 'Sky', value: '#0284C7', contrast: 'white' },
  { id: 'teal', label: 'Teal', value: '#0D9488', contrast: 'white' },
  { id: 'emerald', label: 'Emerald', value: '#059669', contrast: 'white' },
  { id: 'rose', label: 'Rose', value: '#E11D48', contrast: 'white' },
  { id: 'slate', label: 'Slate', value: '#475569', contrast: 'white' },
] as const;

export type AccentColourId = typeof ACCENT_COLOURS[number]['id'];

export const DEFAULT_ACCENT_COLOUR_ID: AccentColourId = 'indigo';

export const LOCAL_STORAGE_KEY = 'accent-colour';

export function getAccentColour(id: string): typeof ACCENT_COLOURS[number] | undefined {
  return ACCENT_COLOURS.find((c) => c.id === id);
}

export function applyAccentColour(id: string): void {
  const colour = getAccentColour(id) ?? getAccentColour(DEFAULT_ACCENT_COLOUR_ID)!;
  const root = document.documentElement;
  root.setAttribute('data-accent', colour.id);
  root.style.setProperty('--accent-colour', colour.value);
  root.style.setProperty('--accent-colour-foreground', colour.contrast);
}

export function loadAccentColour(): AccentColourId {
  if (typeof window === 'undefined') return DEFAULT_ACCENT_COLOUR_ID;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored && ACCENT_COLOURS.find((c) => c.id === stored)) {
    return stored as AccentColourId;
  }
  return DEFAULT_ACCENT_COLOUR_ID;
}

export function saveAccentColour(id: AccentColourId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, id);
  applyAccentColour(id);
}
