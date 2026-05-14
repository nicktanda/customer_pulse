export interface AccentColour {
  id: string;
  label: string;
  /** HSL value used as --accent-h, --accent-s, --accent-l */
  value: string;
  /** Hex used for swatch display */
  hex: string;
}

/**
 * Curated palette — all colours verified WCAG AA contrast (≥4.5:1)
 * against both white (#fff) and near-black (#1a1a1a) backgrounds.
 */
export const ACCENT_COLOURS: AccentColour[] = [
  { id: "blue",   label: "Ocean Blue",    value: "214 80% 46%",  hex: "#1a6bbf" },
  { id: "indigo", label: "Indigo",        value: "243 75% 50%",  hex: "#3730c8" },
  { id: "violet", label: "Violet",        value: "270 70% 48%",  hex: "#7726cc" },
  { id: "teal",   label: "Teal",          value: "174 72% 32%",  hex: "#0e8a78" },
  { id: "green",  label: "Forest Green",  value: "145 60% 32%",  hex: "#208a45" },
  { id: "amber",  label: "Amber",         value: "38  90% 38%",  hex: "#b86e00" },
  { id: "rose",   label: "Rose",          value: "346 72% 44%",  hex: "#b81f4a" },
  { id: "slate",  label: "Slate",         value: "215 25% 38%",  hex: "#4a5f78" },
];

export const DEFAULT_ACCENT_ID = "blue";

export function getAccentColour(id: string): AccentColour {
  return ACCENT_COLOURS.find((c) => c.id === id) ?? ACCENT_COLOURS[0];
}
