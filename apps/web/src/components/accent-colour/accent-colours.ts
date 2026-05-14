export interface AccentColour {
  id: string;
  label: string;
  /** Primary colour hex */
  hex: string;
  /** Darker shade for hover/active states */
  hexDark: string;
  /** Lighter shade for subtle backgrounds */
  hexLight: string;
  /** Text colour to use on top of the primary hex (for contrast) */
  onColour: string;
}

export const ACCENT_COLOURS: AccentColour[] = [
  {
    id: "indigo",
    label: "Indigo",
    hex: "#4f46e5",
    hexDark: "#3730a3",
    hexLight: "#e0e7ff",
    onColour: "#ffffff",
  },
  {
    id: "violet",
    label: "Violet",
    hex: "#7c3aed",
    hexDark: "#5b21b6",
    hexLight: "#ede9fe",
    onColour: "#ffffff",
  },
  {
    id: "sky",
    label: "Sky",
    hex: "#0284c7",
    hexDark: "#0369a1",
    hexLight: "#e0f2fe",
    onColour: "#ffffff",
  },
  {
    id: "teal",
    label: "Teal",
    hex: "#0d9488",
    hexDark: "#0f766e",
    hexLight: "#ccfbf1",
    onColour: "#ffffff",
  },
  {
    id: "emerald",
    label: "Emerald",
    hex: "#059669",
    hexDark: "#047857",
    hexLight: "#d1fae5",
    // Darker text for better contrast on emerald background
    onColour: "#ffffff",
  },
  {
    id: "amber",
    label: "Amber",
    hex: "#d97706",
    hexDark: "#b45309",
    hexLight: "#fef3c7",
    // Dark text for WCAG AA compliance on amber background (~2.9:1 with white)
    onColour: "#000000",
  },
  {
    id: "rose",
    label: "Rose",
    hex: "#e11d48",
    hexDark: "#be123c",
    hexLight: "#ffe4e6",
    onColour: "#ffffff",
  },
  {
    id: "slate",
    label: "Slate",
    hex: "#475569",
    hexDark: "#334155",
    hexLight: "#f1f5f9",
    onColour: "#ffffff",
  },
];

export const DEFAULT_ACCENT_ID = "indigo";

export function getAccentColour(id: string): AccentColour {
  return ACCENT_COLOURS.find((c) => c.id === id) ?? ACCENT_COLOURS[0];
}
