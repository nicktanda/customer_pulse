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

/** Stub server action: replace with real DB write */
async function saveAccentColor(
  hex: string
): Promise<{ error?: string } | void> {
  "use server";
  if (process.env.NODE_ENV !== "production") {
    console.log("[saveAccentColor] persisting", hex);
  }
  // e.g. await db.user.update({ where: { id: userId }, data: { accentColor: hex } });
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
