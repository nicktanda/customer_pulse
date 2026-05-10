import { AccentColorPickerSection } from "../../../components/AccentColorPickerSection";

/**
 * Profile Settings Page
 *
 * Renders user profile settings including the accent colour picker
 * (when the feature flag NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER is enabled).
 *
 * TODO: Replace the stub `getCurrentUserAccentColor` and `saveAccentColor`
 * with real data-fetching / server-action implementations once the backend
 * persistence layer is added.
 */

/** Stub: replace with real session / DB lookup */
async function getCurrentUserAccentColor(): Promise<string | null> {
  // e.g. return (await getServerSession())?.user?.accentColor ?? null;
  return null;
}

/**
 * Stub server action: replace with real DB write.
 *
 * @throws {Error} Not implemented — this stub must be replaced before shipping
 *   to production. Currently no colour is persisted; the preference will be
 *   lost on page refresh (localStorage fallback via useAccentColor is the
 *   only client-side persistence until this is wired up).
 */
async function saveAccentColor(
  hex: string
): Promise<{ error?: string } | void> {
  "use server";

  if (process.env.NODE_ENV === "production") {
    // Fail loudly in production so this isn't silently shipped as a no-op.
    throw new Error(
      "[saveAccentColor] Not implemented: backend persistence has not been wired up. " +
        "See TODO in apps/web/app/settings/profile/page.tsx."
    );
  }

  // Development / test: log and return so the UI can exercise the flow.
  console.log("[saveAccentColor] stub – persisting", hex);
}

export default async function ProfileSettingsPage() {
  const currentAccentColor = await getCurrentUserAccentColor();

  return (
    <main className="profile-settings">
      <h1 className="profile-settings__title">Profile settings</h1>

      {/* Accent colour section – rendered only when feature flag is on */}
      <AccentColorPickerSection
        currentAccentColor={currentAccentColor}
        onSave={saveAccentColor}
      />
    </main>
  );
}
