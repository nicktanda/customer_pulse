"use client";

import React from "react";
import { useAccentColour } from "@/lib/hooks/useAccentColour";
import styles from "./AccentColourPicker.module.css";

export function AccentColourPicker() {
  const { accentId, setAccentId, colours } = useAccentColour();

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Accent Colour</h3>
      <p className={styles.description}>
        Choose a colour for buttons, links, and interactive elements.
      </p>
      <div className={styles.palette} role="radiogroup" aria-label="Accent colour">
        {colours.map((colour) => {
          const isSelected = accentId === colour.id;
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colour.label}
              title={colour.label}
              className={`${styles.swatch} ${isSelected ? styles.selected : ""}`}
              style={{ backgroundColor: colour.value }}
              onClick={() => setAccentId(colour.id)}
            >
              {isSelected && (
                <svg
                  className={styles.checkIcon}
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
