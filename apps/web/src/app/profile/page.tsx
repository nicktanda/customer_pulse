import React from "react";
import AccentColourSection from "./AccentColourSection";

export const metadata = {
  title: "Profile – Accent Colour",
};

export default function ProfilePage() {
  // NEXT_PUBLIC_FEATURE_ACCENT_COLOUR is a build-time env var; we read it
  // server-side here and pass the resolved boolean to the client component,
  // which also handles the A/B localStorage bucket for the "ab" mode.
  const flagValue = process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR;
  const enabled =
    flagValue === "true" ||
    flagValue === "ab" ||
    // Show the picker by default in development when the flag is not set.
    process.env.NODE_ENV === "development";

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem", color: "#111827" }}>
        Profile
      </h1>

      <AccentColourSection enabled={enabled} />
    </main>
  );
}
