import { AccentColorProvider } from '@/components/accent-color-provider';
import { AccentColorSection } from './accent-color-section';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { ACCENT_COLOR_FEATURE_FLAG } from '@/lib/accent-color';

/**
 * Profile settings page.
 *
 * Renders user profile settings including the accent colour picker when the
 * `NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER` environment variable is set to `true`.
 *
 * NOTE: `userId` is hard-coded here as a placeholder. Replace with real session
 * lookup (e.g. `getServerSession`, `auth()`, etc.) before shipping. The server
 * action requires session validation (controlled by the `ACCENT_COLOR_AUTH_STUB`
 * env var) to prevent one user from overwriting another's preferences.
 */
export default async function ProfilePage() {
  // TODO: replace with real session lookup, e.g.:
  //   const session = await getServerSession(authOptions);
  //   if (!session?.user?.id) notFound();
  //   const userId = session.user.id;
  const userId = 'placeholder-user-id';

  // TODO: replace with real DB fetch of the user's saved accent colour.
  const savedAccentColor: string | null = null;

  const accentColorEnabled = isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG, userId);

  return (
    <AccentColorProvider
      initialColor={savedAccentColor}
      enabled={accentColorEnabled}
    >
      <main
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '32px 16px',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '32px',
            color: '#111827',
          }}
        >
          Profile Settings
        </h1>

        <AccentColorSection
          userId={userId}
          featureEnabled={accentColorEnabled}
        />
      </main>
    </AccentColorProvider>
  );
}
