"use client";

import { useCallback, useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";
import {
  applyThemeToDocument,
  readStoredThemePreference,
  writeStoredThemePreference,
  type ThemePreference,
} from "./theme-storage";

/**
 * Lets the user pick light, dark, or "System" (follow OS). Updates `data-bs-theme` on `<html>`
 * so all Bootstrap components pick up the correct palette.
 */
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("auto");

  useEffect(() => {
    const stored = readStoredThemePreference();
    setPref(stored);
    applyThemeToDocument(stored);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredThemePreference() === "auto") {
        applyThemeToDocument("auto");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const choose = useCallback((next: ThemePreference) => {
    // Persist choice so the inline script in `layout.tsx` picks it up on the next full page load too.
    writeStoredThemePreference(next);
    setPref(next);
    applyThemeToDocument(next);
  }, []);

  const label =
    pref === "light" ? "Light" : pref === "dark" ? "Dark" : "System";

  return (
    <Dropdown align="end" className="mb-2">
      <Dropdown.Toggle variant="outline-secondary" size="sm" id="theme-dropdown">
        Appearance: {label}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item active={pref === "light"} onClick={() => choose("light")}>
          Light
        </Dropdown.Item>
        <Dropdown.Item active={pref === "dark"} onClick={() => choose("dark")}>
          Dark
        </Dropdown.Item>
        <Dropdown.Item active={pref === "auto"} onClick={() => choose("auto")}>
          System
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
