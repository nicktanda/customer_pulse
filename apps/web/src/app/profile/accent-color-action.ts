'use server';

import { isValidHex } from '@/lib/accent-color';

export interface SaveAccentColorInput {
  userId: string;
  accentColor: string;
}

/**
 * Server action: persist the user's accent colour preference.
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

  if (!isValidHex(accentColor)) {
    return { success: false, error: 'Invalid hex colour value' };
  }

  // ---------------------------------------------------------------------------
  // TODO: replace with real DB persistence once user_preferences schema is set.
  // Example (Drizzle):
  //
  // await db
  //   .insert(userPreferences)
  //   .values({ userId, accentColor })
  //   .onConflictDoUpdate({
  //     target: userPreferences.userId,
  //     set: { accentColor, updatedAt: new Date() },
  //   });
  // ---------------------------------------------------------------------------

  // Temporary: log to confirm the action is wired correctly.
  console.info(
    `[AccentColor] Saved accent colour ${accentColor} for user ${userId}`,
  );

  return { success: true };
}
