"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { integrations } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { upsertIntegrationCredentials } from "@/lib/integrations-upsert";
import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";
import { QUEUE_DEFAULT } from "@/lib/queue-names";

async function requireProjectEditor() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null) {
    redirect("/app/projects");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/integrations");
  }
  return { userId, projectId };
}

export async function createIntegrationAction(formData: FormData): Promise<void> {
  const { projectId } = await requireProjectEditor();
  const sourceType = Number(formData.get("source_type"));
  const name = String(formData.get("name") ?? "").trim();
  const credsRaw = String(formData.get("credentials_json") ?? "").trim();
  if (!name || !Number.isFinite(sourceType)) {
    redirect("/app/integrations/new?error=form");
  }
  let obj: Record<string, unknown> = {};
  if (credsRaw) {
    try {
      obj = JSON.parse(credsRaw) as Record<string, unknown>;
    } catch {
      redirect("/app/integrations/new?error=json");
    }
  }
  await upsertIntegrationCredentials(projectId, sourceType, name, obj);
  revalidatePath("/app/integrations");
  redirect("/app/integrations");
}

export async function updateIntegrationAction(integrationId: number, formData: FormData): Promise<void> {
  const { projectId } = await requireProjectEditor();
  const db = getDb();
  const [row] = await db.select().from(integrations).where(eq(integrations.id, integrationId)).limit(1);
  if (!row || row.projectId !== projectId) {
    redirect("/app/integrations");
  }

  const name = String(formData.get("name") ?? "").trim();
  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "true";
  const credsRaw = String(formData.get("credentials_json") ?? "").trim();
  if (!name) {
    redirect(`/app/integrations/${integrationId}/edit?error=name`);
  }

  if (credsRaw) {
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(credsRaw) as Record<string, unknown>;
    } catch {
      redirect(`/app/integrations/${integrationId}/edit?error=json`);
    }
    await upsertIntegrationCredentials(projectId, row.sourceType, name, obj, { enabled });
  } else {
    await db
      .update(integrations)
      .set({ name, enabled, updatedAt: new Date() })
      .where(eq(integrations.id, integrationId));
  }

  const webhookSecret = String(formData.get("webhook_secret") ?? "").trim();
  if (webhookSecret) {
    await db
      .update(integrations)
      .set({ webhookSecret, updatedAt: new Date() })
      .where(eq(integrations.id, integrationId));
  }

  revalidatePath("/app/integrations");
  redirect(`/app/integrations/${integrationId}`);
}

export async function deleteIntegrationAction(integrationId: number, _formData?: FormData): Promise<void> {
  const { projectId } = await requireProjectEditor();
  const db = getDb();
  const [row] = await db.select().from(integrations).where(eq(integrations.id, integrationId)).limit(1);
  if (!row || row.projectId !== projectId) {
    redirect("/app/integrations");
  }
  await db.delete(integrations).where(eq(integrations.id, integrationId));
  revalidatePath("/app/integrations");
  redirect("/app/integrations");
}

/** Maps source_type → BullMQ job name (aligned with worker repeatable schedules). */
function syncJobNameForSourceType(sourceType: number): string | null {
  const map: Record<number, string> = {
    0: "SyncLinearJob",
    1: "SyncGoogleFormsJob",
    2: "SyncSlackJob",
    6: "SyncJiraJob",
    7: "SyncLogrocketJob",
    8: "SyncFullstoryJob",
    9: "SyncIntercomJob",
    10: "SyncZendeskJob",
    11: "SyncSentryJob",
    4: "SyncGongJob",
    5: "SyncExcelOnlineJob",
  };
  return map[sourceType] ?? null;
}

export async function syncIntegrationNowAction(integrationId: number, _formData?: FormData): Promise<void> {
  const { projectId } = await requireProjectEditor();
  const db = getDb();
  const [row] = await db.select().from(integrations).where(eq(integrations.id, integrationId)).limit(1);
  if (!row || row.projectId !== projectId) {
    redirect("/app/integrations");
  }
  const jobName = syncJobNameForSourceType(row.sourceType);
  if (jobName) {
    try {
      const q = new Queue(QUEUE_DEFAULT, { connection: getRedis() });
      await q.add(jobName, { integrationId: row.id, projectId }, { removeOnComplete: 500, removeOnFail: 1000 });
    } catch {
      // Redis optional locally
    }
  }
  revalidatePath("/app/integrations");
  redirect(`/app/integrations/${integrationId}?notice=sync`);
}

export async function syncAllIntegrationsAction(_formData?: FormData): Promise<void> {
  const { projectId } = await requireProjectEditor();
  const db = getDb();
  const rows = await db.select().from(integrations).where(eq(integrations.projectId, projectId));
  try {
    const q = new Queue(QUEUE_DEFAULT, { connection: getRedis() });
    for (const row of rows) {
      const jobName = syncJobNameForSourceType(row.sourceType);
      if (jobName && row.enabled) {
        await q.add(jobName, { integrationId: row.id, projectId }, { removeOnComplete: 500, removeOnFail: 1000 });
      }
    }
  } catch {
    // ignore
  }
  revalidatePath("/app/integrations");
  redirect("/app/integrations?notice=syncall");
}
