import React from "react";
import AccentColourSection from "./AccentColourSection";
import { isAccentColourEnabled } from "./accent-colour-feature-flag";

export const metadata = {
  title: "Profile – Accent Colour",
};

export default function ProfilePage() {
  // isAccentColourEnabled() is client-side (reads localStorage/env);
  // we pass the env-derived flag value from the server and let the
  // client component handle the localStorage A/B bucket.
  const enabled =
    process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR === "true" ||
    process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR === "ab" ||
    // Default to showing the picker when the flag is unset in dev.
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
