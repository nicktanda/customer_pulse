'use server';

import { isValidHex } from '@/lib/accent-color';

export interface SaveAccentColorInput {
  userId: string;
  accentColor: string;
}

/**
 * Server action: persist the user's accent colour preference.
 *
 * IMPORTANT: Before enabling real DB persistence, replace the placeholder
 * session check below with a real `getServerSession` (or equivalent) call
 * to verify `userId` against the authenticated session. This prevents one
 * user from overwriting another user's preferences.
 *
 * Replace the placeholder persistence logic below with your actual
 * database call (e.g. Drizzle ORM update on a user_preferences table).
 */
export async function saveAccentColorAction(
  input: SaveAccentColorInput,
): Promise<{ success: boolean; error?: string }> {
  const { userId, accentColor } = input;

  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  // ---------------------------------------------------------------------------
  // AUTH GUARD — replace this stub with a real session check before shipping.
  //
  // Example:
  //   const session = await getServerSession(authOptions);
  //   if (!session || session.user.id !== userId) {
  //     return { success: false, error: 'Unauthorised' };
  //   }
  //
  // Until real auth is wired, reject all writes so no data is mutated by
  // unauthenticated or mis-authenticated callers.
  // ---------------------------------------------------------------------------
  const isAuthStubEnabled = process.env.ACCENT_COLOR_AUTH_STUB === 'allow';
  if (!isAuthStubEnabled) {
    // In production (or any env where the stub is not explicitly unlocked),
    // refuse to write until real session validation is in place.
    return {
      success: false,
      error:
        'Server action requires authenticated session. Wire getServerSession before enabling.',
    };
  }

  if (!isValidHex(accentColor)) {
    return { success: false, error: 'Invalid hex colour value' };
  }

  // ---------------------------------------------------------------------------
  // TODO: replace with real DB persistence once user_preferences schema is set.
  //
  // Example (Drizzle):
  //
  //   await db
  //     .insert(userPreferences)
  //     .values({ userId, accentColor })
  //     .onConflictDoUpdate({
  //       target: userPreferences.userId,
  //       set: { accentColor, updatedAt: new Date() },
  //     });
  // ---------------------------------------------------------------------------

  // Temporary: log to confirm the action is wired correctly.
  console.info(
    `[AccentColor] Saved accent colour ${accentColor} for user ${userId}`,
  );

  return { success: true };
}
