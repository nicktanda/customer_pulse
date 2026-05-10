import { AccentColorPickerSection } from "../../../components/AccentColorPickerSection";
import { isFeatureEnabled } from "../../../lib/featureFlags";

/**
 * Profile Settings Page
 *
 * Renders user profile settings including the accent colour picker
 * (when the feature flag NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER is enabled).
 *
 * TODO (tracked in GitHub issue #XXX):
 * - Implement `getCurrentUserAccentColor` using real session/DB lookup
 * - Implement `saveAccentColor` with real DB write
 * - Wire `AccentColorProvider` into the root layout (see AccentColorProvider.tsx)
 * - Only enable NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER in production AFTER
 *   the persistence layer is complete — the current stub throws in production
 */

/** Stub: replace with real session / DB lookup */
async function getCurrentUserAccentColor(): Promise<string | null> {
  // e.g. return (await getServerSession())?.user?.accentColor ?? null;
  return null;
}

/**
 * Stub server action: replace with real DB write.
 *
 * @throws {Error} Not implemented — this stub must be replaced before enabling
 *   the feature flag in production. Currently no colour is persisted; the
 *   preference will be lost on page refresh (localStorage fallback via
 *   useAccentColor is the only client-side persistence until this is wired up).
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
  // Feature flag is checked in the Server Component so that AccentColorPickerSection
  // is never mounted (and its hooks never run) when the flag is off.
  const accentColorPickerEnabled = isFeatureEnabled("accentColorPicker");
  const currentAccentColor = accentColorPickerEnabled
    ? await getCurrentUserAccentColor()
    : null;

  return (
    <main className="profile-settings">
      <h1 className="profile-settings__title">Profile settings</h1>

      {/* Accent colour section – rendered only when feature flag is on */}
      {accentColorPickerEnabled && (
        <AccentColorPickerSection
          currentAccentColor={currentAccentColor}
          onSave={saveAccentColor}
        />
      )}
    </main>
  );
}
