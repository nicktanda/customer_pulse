'use server';

import { isValidHex } from '@/lib/accent-color';

export interface SaveAccentColorInput {
  userId: string;
  accentColor: string;
}

/**
 * Server action: persist the user's accent colour preference.
 *
 * IMPORTANT: Before enabling real DB persistence, verify `userId` against
 * the authenticated session (e.g. via `getServerSession`) to prevent one
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

  // NOTE: `userId` must be validated against the authenticated session here
  // before any DB write to prevent privilege escalation.

  if (!isValidHex(accentColor)) {
    return { success: false, error: 'Invalid hex colour value' };
  }

  // ---------------------------------------------------------------------------
  // TODO: replace with real DB persistence once user_preferences schema is set.
  // Also add session validation:
  //
  //   const session = await getServerSession(authOptions);
  //   if (!session || session.user.id !== userId) {
  //     return { success: false, error: 'Unauthorised' };
  //   }
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
