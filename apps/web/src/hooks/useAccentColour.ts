import { useEffect, useState } from 'react';

export const ACCENT_COLOURS = [
  { id: 'indigo',  label: 'Indigo',  value: '#4F46E5' },
  { id: 'violet',  label: 'Violet',  value: '#7C3AED' },
  { id: 'sky',     label: 'Sky',     value: '#0284C7' },
  { id: 'teal',    label: 'Teal',    value: '#0F766E' },
  { id: 'emerald', label: 'Emerald', value: '#059669' },
  { id: 'amber',   label: 'Amber',   value: '#B45309' },
  { id: 'rose',    label: 'Rose',    value: '#BE185D' },
  { id: 'slate',   label: 'Slate',   value: '#475569' },
] as const;

export type AccentColourId = (typeof ACCENT_COLOURS)[number]['id'];

const STORAGE_KEY = 'accent-colour';
const DEFAULT_ACCENT: AccentColourId = 'indigo';

function applyAccentColour(value: string): void {
  const root = document.documentElement;
  root.style.setProperty('--accent-colour', value);
  // Derive a slightly darker shade for hover states (simple darkening via opacity layering)
  root.style.setProperty('--accent-colour-dark', value);
  root.setAttribute('data-accent', value);
}

export function useAccentColour() {
  const [accentId, setAccentId] = useState<AccentColourId>(DEFAULT_ACCENT);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AccentColourId | null;
    const resolved =
      stored && ACCENT_COLOURS.some((c) => c.id === stored)
        ? (stored as AccentColourId)
        : DEFAULT_ACCENT;
    setAccentId(resolved);
    const colour = ACCENT_COLOURS.find((c) => c.id === resolved)!;
    applyAccentColour(colour.value);
  }, []);

  const setAccent = (id: AccentColourId) => {
    const colour = ACCENT_COLOURS.find((c) => c.id === id);
    if (!colour) return;
    setAccentId(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyAccentColour(colour.value);
  };

  return { accentId, setAccent, colours: ACCENT_COLOURS };
}
