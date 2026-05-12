"use client";

import React, { useEffect, useRef, useState } from "react";
import AccentColourPicker, { loadStoredAccent } from "../components/AccentColourPicker";
import { isAccentColourEnabled } from "./accent-colour-feature-flag";

/**
 * Drop-in section for the user profile / settings page.
 * Reads from localStorage on the client and persists changes there
 * (and to the server via the optional onSave prop).
 */
interface AccentColourSectionProps {
  /**
   * Feature-flag guard – render nothing when false.
   * When omitted the client-side flag utility is consulted instead,
   * supporting the A/B bucket assignment.
   */
  enabled?: boolean;
  /** Optional server-persist callback */
  onSave?: (colour: string) => Promise<void>;
  /** Override from server-side user preferences */
  serverColour?: string;
}

export default function AccentColourSection({
  enabled,
  onSave,
  serverColour,
}: AccentColourSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const savedFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    // Cleanup any pending saved-feedback timer on unmount
    return () => {
      if (savedFeedbackTimerRef.current !== null) {
        clearTimeout(savedFeedbackTimerRef.current);
      }
    };
  }, []);

  // Avoid SSR/hydration mismatch: localStorage and the A/B bucket are
  // only available after the component has mounted on the client.
  if (!mounted) return null;

  // If the caller explicitly passes enabled=false, hide immediately.
  // Otherwise fall back to the client-side feature flag (which handles A/B).
  const show = enabled !== undefined ? enabled : isAccentColourEnabled();
  if (!show) return null;

  const initial = serverColour ?? loadStoredAccent();

  const handleChange = async (colour: string) => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(colour);
      setSavedFeedback(true);
      if (savedFeedbackTimerRef.current !== null) {
        clearTimeout(savedFeedbackTimerRef.current);
      }
      savedFeedbackTimerRef.current = setTimeout(() => setSavedFeedback(false), 2000);
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

      {/* Only wire onChange when there is a server-persist callback to avoid
          spurious async calls on every colour pick. */}
      <AccentColourPicker
        initialColour={initial}
        onChange={onSave ? handleChange : undefined}
      />

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
