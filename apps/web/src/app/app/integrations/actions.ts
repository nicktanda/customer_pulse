"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { integrations, IntegrationSourceType } from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { upsertIntegrationCredentials } from "@/lib/integrations-upsert";
import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";
import { QUEUE_DEFAULT } from "@/lib/queue-names";

const ANTHROPIC_SOURCE_TYPE = 13;

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
  const db = await getRequestDb();
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
  const db = await getRequestDb();
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
  const db = await getRequestDb();
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

/** Persists GitHub credentials as a GitHub integration row. */
export async function saveGithubIntegrationAction(formData: FormData): Promise<void> {
  const { projectId } = await requireProjectEditor();
  const accessTokenInput = String(formData.get("access_token") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const repo = String(formData.get("repo") ?? "").trim();
  const defaultBranch = String(formData.get("default_branch") ?? "").trim() || "main";
  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "true";

  let accessToken = accessTokenInput;
  if (!accessToken) {
    const db = await getRequestDb();
    const masterKey = process.env.LOCKBOX_MASTER_KEY;
    const [existing] = await db
      .select({ credentialsCiphertext: integrations.credentialsCiphertext })
      .from(integrations)
      .where(and(eq(integrations.projectId, projectId), eq(integrations.sourceType, IntegrationSourceType.github)))
      .limit(1);
    if (existing?.credentialsCiphertext && masterKey) {
      try {
        const raw = decryptCredentialsColumn(existing.credentialsCiphertext, masterKey);
        const prev = JSON.parse(raw) as { access_token?: string };
        if (typeof prev.access_token === "string" && prev.access_token.length > 0) {
          accessToken = prev.access_token;
        }
      } catch {
        /* keep accessToken empty → error below */
      }
    }
  }

  if (!accessToken) {
    redirect("/app/integrations/github?error=token");
  }

  await upsertIntegrationCredentials(
    projectId,
    IntegrationSourceType.github,
    "GitHub",
    {
      access_token: accessToken,
      owner,
      repo,
      default_branch: defaultBranch,
    },
    { enabled },
  );

  revalidatePath("/app/integrations");
  revalidatePath("/app/integrations/github");
  redirect("/app/integrations/github?notice=saved");
}

/** Persists Anthropic API key as an integration credential (type 13). */
export async function saveAnthropicIntegrationAction(formData: FormData): Promise<void> {
  const { projectId } = await requireProjectEditor();
  const apiKey = String(formData.get("api_key") ?? "").trim();

  if (!apiKey) {
    redirect("/app/integrations/anthropic?error=key");
  }

  await upsertIntegrationCredentials(
    projectId,
    ANTHROPIC_SOURCE_TYPE,
    "Anthropic",
    { api_key: apiKey },
    { enabled: true },
  );

  revalidatePath("/app/integrations");
  revalidatePath("/app/integrations/anthropic");
  redirect("/app/integrations/anthropic?notice=saved");
}

export async function syncAllIntegrationsAction(_formData?: FormData): Promise<void> {
  const { projectId } = await requireProjectEditor();
  const db = await getRequestDb();
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
