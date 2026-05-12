"use client";

import React, { useState } from "react";
import { useAccentColor } from "./AccentColorProvider";
import AccentColorPicker from "./AccentColorPicker";

interface SaveResult {
  ok: boolean;
  message: string;
}

/**
 * AccentColorSettings
 *
 * A self-contained profile-settings card that lets the user choose their
 * accent colour and persists it via an API call.
 *
 * Usage:
 *   <AccentColorSettings onSave={(hex) => yourApiCall(hex)} />
 */
export function AccentColorSettings({
  onSave,
}: {
  onSave: (hex: string) => Promise<void>;
}) {
  const { accentColor, setAccentColor, isFeatureEnabled } = useAccentColor();
  const [pending, setPending] = useState<string>(accentColor);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  if (!isFeatureEnabled) {
    return null;
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    setResult(null);
    try {
      await onSave(pending);
      setAccentColor(pending);
      setResult({ ok: true, message: "Accent colour saved!" });
    } catch (err) {
      setResult({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "Failed to save. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="accent-color-heading"
      style={{
        padding: "1.5rem",
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        maxWidth: "32rem",
      }}
    >
      <div>
        <h3
          id="accent-color-heading"
          style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}
        >
          Accent Colour
        </h3>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.875rem",
            color: "#6b7280",
          }}
        >
          Personalise the highlight colour used for buttons, active states, and
          focus indicators.
        </p>
      </div>

      {/* Live preview strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#f9fafb",
          borderRadius: "0.5rem",
          border: "1px solid #e5e7eb",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "1.5rem",
            height: "1.5rem",
            borderRadius: "50%",
            backgroundColor: pending,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "0.875rem", color: "#374151" }}>
          Preview:{" "}
          <strong style={{ color: pending }}>Active link</strong> and{" "}
          <button
            type="button"
            className="btn-accent"
            style={{
              backgroundColor: pending,
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.2rem 0.75rem",
              fontSize: "0.8rem",
              cursor: "default",
            }}
          >
            Button
          </button>
        </span>
      </div>

      <AccentColorPicker
        value={pending}
        onChange={setPending}
        isSaving={isSaving}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          type="button"
          className="btn-accent"
          onClick={handleSave}
          disabled={isSaving || pending === accentColor}
          style={{
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1.25rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            cursor:
              isSaving || pending === accentColor ? "not-allowed" : "pointer",
            opacity: isSaving || pending === accentColor ? 0.6 : 1,
          }}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>

        {result && (
          <p
            role="status"
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: result.ok ? "#059669" : "#dc2626",
            }}
          >
            {result.message}
          </p>
        )}
      </div>
    </section>
  );
}

export default AccentColorSettings;
