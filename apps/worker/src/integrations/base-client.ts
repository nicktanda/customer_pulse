/**
 * Base integration client — shared logic for all sync clients.
 * Handles credential decryption, external ID deduplication, and feedback creation.
 */
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { feedbacks, integrations } from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { Queue } from "bullmq";
import { getRedisConnection } from "../redis.js";
import { QUEUE_DEFAULT } from "../queue-names.js";

export interface SyncResult {
  created: number;
  skipped: number;
  errors: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export interface FeedbackItem {
  title: string;
  content: string;
  authorName?: string;
  authorEmail?: string;
  sourceExternalId: string;
  category?: number;
  priority?: number;
  rawData?: Record<string, unknown>;
}

export abstract class BaseIntegrationClient {
  protected credentials: Record<string, unknown>;
  protected integrationId: number;
  protected projectId: number;
  protected sourceType: number;

  constructor(
    protected db: Database,
    integration: { id: number; projectId: number; sourceType: number; credentialsCiphertext: string | null },
  ) {
    this.integrationId = integration.id;
    this.projectId = integration.projectId;
    this.sourceType = integration.sourceType;

    const masterKey = process.env.LOCKBOX_MASTER_KEY ?? "";
    const decrypted = decryptCredentialsColumn(integration.credentialsCiphertext, masterKey);
    this.credentials = decrypted ? (JSON.parse(decrypted) as Record<string, unknown>) : {};
  }

  abstract testConnection(): Promise<TestConnectionResult>;
  abstract fetchItems(): Promise<FeedbackItem[]>;

  async sync(): Promise<SyncResult> {
    const result: SyncResult = { created: 0, skipped: 0, errors: 0 };

    let items: FeedbackItem[];
    try {
      items = await this.fetchItems();
    } catch (err) {
      console.error(`[sync] ${this.constructor.name} fetch error:`, err instanceof Error ? err.message : err);
      result.errors = 1;
      return result;
    }

    for (const item of items) {
      try {
        // Check for duplicate by external ID
        if (item.sourceExternalId) {
          const [existing] = await this.db
            .select({ id: feedbacks.id })
            .from(feedbacks)
            .where(
              and(
                eq(feedbacks.source, this.sourceType),
                eq(feedbacks.sourceExternalId, item.sourceExternalId),
              ),
            )
            .limit(1);
          if (existing) {
            result.skipped++;
            continue;
          }
        }

        const now = new Date();
        const [created] = await this.db.insert(feedbacks).values({
          projectId: this.projectId,
          source: this.sourceType,
          sourceExternalId: item.sourceExternalId,
          title: item.title?.slice(0, 255) ?? null,
          content: item.content,
          authorName: item.authorName?.slice(0, 255) ?? null,
          authorEmail: item.authorEmail?.slice(0, 255) ?? null,
          category: item.category ?? 0,
          priority: item.priority ?? 0,
          status: 0,
          rawData: item.rawData ?? {},
          createdAt: now,
          updatedAt: now,
        }).returning({ id: feedbacks.id });
        result.created++;

        // Enqueue AI classification immediately
        if (created) {
          const q = new Queue(QUEUE_DEFAULT, { connection: getRedisConnection() });
          await q.add("process_feedback", { feedbackId: created.id }, { removeOnComplete: 200, removeOnFail: 500 });
        }
      } catch (err) {
        // Unique constraint on source + external ID — skip
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
          result.skipped++;
        } else {
          result.errors++;
          console.error(`[sync] Error creating feedback:`, err instanceof Error ? err.message : err);
        }
      }
    }

    // Update last synced timestamp
    await this.db
      .update(integrations)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(integrations.id, this.integrationId));

    return result;
  }

  protected str(key: string): string {
    return String(this.credentials[key] ?? "");
  }
}
