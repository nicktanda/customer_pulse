"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { integrations, IntegrationSourceType } from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { upsertIntegrationCredentials } from "@/lib/integrations-upsert";

async function requireEditorProject() {
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
    redirect("/app/settings");
  }
  return { projectId };
}

/** Persists GitHub credentials as a GitHub integration row. */
export async function saveGithubSettingsAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditorProject();
  const accessTokenInput = String(formData.get("access_token") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const repo = String(formData.get("repo") ?? "").trim();
  const defaultBranch = String(formData.get("default_branch") ?? "").trim() || "main";
  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "true";

  let accessToken = accessTokenInput;
  if (!accessToken) {
    const db = getDb();
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
    redirect("/app/settings?error=github_token");
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

  revalidatePath("/app/settings");
  redirect("/app/settings?notice=github");
}
