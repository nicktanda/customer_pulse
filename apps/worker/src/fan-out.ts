/**
 * Fan-out: enqueues one child job per active tenant.
 *
 * Used by repeatable/cron schedules in multi-tenant mode. A single global cron
 * fires the `FanOut_*` job, which queries the control plane for all active
 * tenants and enqueues one real job per tenant with { tenantId, tenantSlug }.
 */
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import { tenants, TenantStatus } from "@customer-pulse/db/control-plane";
import { getWorkerControlPlaneDb } from "./db.js";
import { getRedisConnection } from "./redis.js";
import { QUEUE_DEFAULT, QUEUE_MAILERS } from "./queue-names.js";

export async function fanOut(childJobName: string, queueName: string): Promise<number> {
  const cpDb = getWorkerControlPlaneDb();
  const activeTenants = await cpDb
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.status, TenantStatus.active));

  const q = new Queue(queueName, { connection: getRedisConnection() });

  for (const tenant of activeTenants) {
    await q.add(
      childJobName,
      { tenantId: tenant.id, tenantSlug: tenant.slug },
      { removeOnComplete: 100, removeOnFail: 500 },
    );
  }

  console.log(`[worker] fanOut ${childJobName} → ${activeTenants.length} tenant(s)`);
  return activeTenants.length;
}

/** Map FanOut_* job names to their child job + queue. */
export const FAN_OUT_MAP: Record<string, { childJob: string; queue: string }> = {
  FanOut_ProcessFeedbackBatch: { childJob: "ProcessFeedbackBatchJob", queue: QUEUE_DEFAULT },
  FanOut_SendDailyPulse: { childJob: "SendDailyPulseJob", queue: QUEUE_MAILERS },
  FanOut_GenerateInsights: { childJob: "GenerateInsightsJob", queue: QUEUE_DEFAULT },
  FanOut_WeeklyThemes: { childJob: "WeeklyThemeAnalysisJob", queue: QUEUE_DEFAULT },
  FanOut_BuildAttackGroups: { childJob: "BuildAttackGroupsJob", queue: QUEUE_DEFAULT },
  FanOut_SyncAll: { childJob: "SyncAllJob", queue: QUEUE_DEFAULT },
};
