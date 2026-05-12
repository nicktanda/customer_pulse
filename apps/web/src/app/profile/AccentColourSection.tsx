"use client";

import React, { useEffect, useState } from "react";
import AccentColourPicker, { loadStoredAccent } from "../components/AccentColourPicker";
import "../styles/accent-colour-picker.css";

/**
 * Drop-in section for the user profile / settings page.
 * Reads from localStorage on the client and persists changes there
 * (and to the server via the optional onSave prop).
 */
interface AccentColourSectionProps {
  /** Feature-flag guard – render nothing when false */
  enabled?: boolean;
  /** Optional server-persist callback */
  onSave?: (colour: string) => Promise<void>;
  /** Override from server-side user preferences */
  serverColour?: string;
}

export default function AccentColourSection({
  enabled = true,
  onSave,
  serverColour,
}: AccentColourSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!enabled) return null;
  // Avoid SSR/hydration mismatch for localStorage reads
  if (!mounted) return null;

  const initial = serverColour ?? loadStoredAccent();

  const handleChange = async (colour: string) => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(colour);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="accent-colour-heading" style={{ padding: "1.5rem 0" }}>
      <h2
        id="accent-colour-heading"
        style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}
      >
        Personalisation
      </h2>

      <AccentColourPicker initialColour={initial} onChange={handleChange} />

      {saving && (
        <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.5rem" }}>
          Saving…
        </p>
      )}
      {savedFeedback && (
        <p
          role="status"
          style={{ fontSize: "0.8125rem", color: "#065f46", marginTop: "0.5rem" }}
        >
          ✓ Colour saved
        </p>
      )}
    </section>
  );
}
