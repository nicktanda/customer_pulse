"use client";

import React, { useState } from "react";
import {
  ACCENT_COLORS,
  AccentColorId,
  useAccentColor,
} from "../contexts/accent-color-context";

function PreviewSnippet({ accentValue }: { accentValue: string }) {
  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3 text-sm"
      aria-label="Accent colour preview"
    >
      <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide font-medium">
        Preview
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-white font-medium shadow-sm focus:outline-none"
        style={{
          backgroundColor: accentValue,
          boxShadow: `0 0 0 2px ${accentValue}40`,
        } as React.CSSProperties}
      >
        Save changes
      </button>
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 rounded-full"
          style={{
            backgroundColor: accentValue,
            boxShadow: `0 0 0 2px white, 0 0 0 4px ${accentValue}`,
          } as React.CSSProperties}
        />
        <span
          className="font-medium"
          style={{ color: accentValue }}
        >
          Highlighted text
        </span>
      </div>
      <div className="h-1 rounded-full w-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full w-2/3 transition-all"
          style={{ backgroundColor: accentValue }}
        />
      </div>
    </div>
  );
}

export function AccentColorPicker() {
  const { accentId, setAccentId } = useAccentColor();
  const [previewId, setPreviewId] = useState<AccentColorId | null>(null);

  const activeId = previewId ?? accentId;
  const activeColor = ACCENT_COLORS.find((c) => c.id === activeId);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Accent colour
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Applied to buttons, links, and focus indicators throughout the app.
        </p>
      </div>

      {/* Swatch grid */}
      <div
        role="radiogroup"
        aria-label="Choose an accent colour"
        className="flex flex-wrap gap-3"
      >
        {ACCENT_COLORS.map((color) => {
          const isSelected = accentId === color.id;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={color.label}
              title={color.label}
              className={[
                "h-8 w-8 rounded-full transition-transform focus:outline-none",
                isSelected
                  ? "scale-110"
                  : "hover:scale-105",
              ].join(" ")}
              style={{
                backgroundColor: color.value,
                boxShadow: isSelected
                  ? `0 0 0 2px white, 0 0 0 4px ${color.value}`
                  : undefined,
              } as React.CSSProperties}
              onMouseEnter={() => setPreviewId(color.id)}
              onMouseLeave={() => setPreviewId(null)}
              onFocus={() => setPreviewId(color.id)}
              onBlur={() => setPreviewId(null)}
              onClick={() => setAccentId(color.id)}
            />
          );
        })}
      </div>

      {/* Live preview */}
      {activeColor && <PreviewSnippet accentValue={activeColor.value} />}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Current accent:{" "}
        <span className="font-medium" style={{ color: activeColor?.value }}>
          {activeColor?.label}
        </span>
      </p>
    </div>
  );
}
