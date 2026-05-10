/**
 * /profile/accent-color
 *
 * Standalone page that renders the accent-colour picker inside the user's
 * profile settings.  Gated by the ACCENT_COLOR_PICKER feature flag.
 *
 * In a real app you would:
 *  1. Fetch the user's saved preference from the server via a Server Component
 *  2. Pass it as a prop to the client island
 *  3. Replace the hard-coded mock below with a real data-fetching call
 */

import { isFeatureEnabled } from "../../../lib/featureFlags";
import { notFound } from "next/navigation";
import AccentColorSettings from "./AccentColorSettings";

export const metadata = {
  title: "Accent Colour · Profile Settings",
  description: "Personalise your accent colour throughout the app.",
};

export default function AccentColorPage() {
  if (!isFeatureEnabled("ACCENT_COLOR_PICKER")) {
    notFound();
  }

  /**
   * TODO: replace with real server-side data fetch, e.g.:
   *   const session = await getServerSession();
   *   const prefs   = await db.userPreferences.findUnique({ where: { userId: session.user.id } });
   *   const saved   = prefs?.accentColor ?? null;
   */
  const savedAccentColor: string | null = null;

  return (
    <main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Profile Settings
      </h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
        Customise how the app looks and feels.
      </p>

      <section
        style={{
          padding: "1.5rem",
          border: "1px solid #e5e7eb",
          borderRadius: "0.75rem",
          background: "#ffffff",
        }}
      >
        <AccentColorSettings initialValue={savedAccentColor} />
      </section>
    </main>
  );
}
