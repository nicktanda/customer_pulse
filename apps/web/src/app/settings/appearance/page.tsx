"use client";

import { AccentColorSettings } from "../../../components/AccentColorSettings";

async function saveAccentColor(hex: string): Promise<void> {
  const res = await fetch("/api/user/accent-color", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accentColor: hex }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "Failed to save accent colour");
  }
}

export default function AppearanceSettingsPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Appearance
      </h1>
      <AccentColorSettings onSave={saveAccentColor} />
    </main>
  );
}
