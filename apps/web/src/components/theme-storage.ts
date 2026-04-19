/**
 * Key used in localStorage for light / dark / system (auto) appearance.
 * The inline script in the root layout reads the same key so the first paint matches the user's choice.
 */
export const THEME_STORAGE_KEY = "kairos-theme";

export type ThemePreference = "light" | "dark" | "auto";

/** Resolve "auto" using the OS / browser setting. */
export function effectiveBootstrapTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "dark") {
    return "dark";
  }
  if (pref === "light") {
    return "light";
  }
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "auto";
  }
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "auto") {
      return raw;
    }
  } catch {
    // Private mode / blocked storage — fall through to auto.
  }
  return "auto";
}

export function writeStoredThemePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Ignore quota / private mode.
  }
}

export function applyThemeToDocument(pref: ThemePreference) {
  const mode = effectiveBootstrapTheme(pref);
  document.documentElement.setAttribute("data-bs-theme", mode);
}
