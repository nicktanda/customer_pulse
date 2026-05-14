export const ACCENT_COLOURS = [
  { id: 'blue', label: 'Blue', value: '#2563eb', dark: '#3b82f6' },
  { id: 'violet', label: 'Violet', value: '#7c3aed', dark: '#8b5cf6' },
  { id: 'rose', label: 'Rose', value: '#e11d48', dark: '#f43f5e' },
  { id: 'orange', label: 'Orange', value: '#ea580c', dark: '#f97316' },
  { id: 'emerald', label: 'Emerald', value: '#059669', dark: '#10b981' },
  { id: 'teal', label: 'Teal', value: '#0d9488', dark: '#14b8a6' },
  { id: 'amber', label: 'Amber', value: '#b45309', dark: '#f59e0b' },
  { id: 'sky', label: 'Sky', value: '#0284c7', dark: '#0ea5e9' },
] as const;

export type AccentColourId = (typeof ACCENT_COLOURS)[number]['id'];

export const DEFAULT_ACCENT: AccentColourId = 'blue';

export const ACCENT_STORAGE_KEY = 'xeno_accent_colour';

export function getAccentColour(id: AccentColourId) {
  return ACCENT_COLOURS.find((c) => c.id === id) ?? ACCENT_COLOURS[0];
}

export function applyAccentColour(id: AccentColourId) {
  if (typeof document === 'undefined') return;
  const colour = getAccentColour(id);
  const root = document.documentElement;
  root.setAttribute('data-accent', id);
  root.style.setProperty('--accent', colour.value);
  root.style.setProperty('--accent-dark', colour.dark);
  // Wire into Bootstrap / shared design tokens
  root.style.setProperty('--bs-primary', colour.value);
  root.style.setProperty('--bs-primary-rgb', hexToRgb(colour.value));
  root.style.setProperty('--bs-link-color', colour.value);
  root.style.setProperty('--bs-link-hover-color', colour.dark);
  root.style.setProperty('--bs-btn-bg', colour.value);
  root.style.setProperty('--bs-btn-border-color', colour.value);
  root.style.setProperty('--bs-btn-hover-bg', colour.dark);
  root.style.setProperty('--bs-btn-hover-border-color', colour.dark);
  root.style.setProperty('--bs-focus-ring-color', colour.value + '40');
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '37,99,235';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
