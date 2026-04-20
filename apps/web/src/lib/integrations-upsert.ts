import "server-only";

import { and, eq } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { encryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { integrations } from "@customer-pulse/db/client";
import { getRequestDb } from "@/lib/db";

/**
 * Creates or updates an integration row with Lockbox-compatible encrypted JSON credentials.
 */
export async function upsertIntegrationCredentials(
  projectId: number,
  sourceType: number,
  name: string,
  credentialsObject: Record<string, unknown>,
  options?: { enabled?: boolean; db?: Database },
): Promise<number> {
  const masterKey = process.env.LOCKBOX_MASTER_KEY;
  if (!masterKey) {
    throw new Error("LOCKBOX_MASTER_KEY is required to store integration credentials.");
  }

  const json = JSON.stringify(credentialsObject);
  const ciphertext = encryptCredentialsColumn(json, masterKey);
  const db = options?.db ?? (await getRequestDb());
  const now = new Date();
  const enabled = options?.enabled ?? true;

  const [existing] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(and(eq(integrations.projectId, projectId), eq(integrations.sourceType, sourceType)))
    .limit(1);

  if (existing) {
    await db
      .update(integrations)
      .set({
        name,
        credentialsCiphertext: ciphertext,
        enabled,
        updatedAt: now,
      })
      .where(eq(integrations.id, existing.id));
    return existing.id;
  }

  const [ins] = await db
    .insert(integrations)
    .values({
      projectId,
      sourceType,
      name,
      credentialsCiphertext: ciphertext,
      enabled,
      createdAt: now,
      updatedAt: now,
      webhookSecret: null,
      lastSyncedAt: null,
      syncFrequencyMinutes: 15,
    })
    .returning({ id: integrations.id });

  if (!ins) {
    throw new Error("Failed to insert integration");
  }
  return ins.id;
}
