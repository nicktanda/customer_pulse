"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { integrations, projects, projectUsers, projectInvitations, users } from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import {
  userHasProjectAccess,
  userIsProjectOwner,
} from "@/lib/project-access";
import { CURRENT_PROJECT_COOKIE } from "@/lib/current-project";
import { cookies } from "next/headers";
import { draftFromContext } from "@/lib/ai-drafts";
import { slugifyName } from "./slug";

async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return Number(session.user.id);
}

export async function createProjectAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) {
    redirect("/app/projects/new?error=name");
  }

  const db = await getRequestDb();
  const now = new Date();
  let slug = slugifyName(name);
  const [existing] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1);
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const [proj] = await db
    .insert(projects)
    .values({
      name,
      description,
      slug,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: projects.id });

  if (!proj) {
    redirect("/app/projects/new?error=save");
  }

  await db.insert(projectUsers).values({
    projectId: proj.id,
    userId,
    isOwner: true,
    createdAt: now,
    updatedAt: now,
  });

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_PROJECT_COOKIE, String(proj.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });

  revalidatePath("/app");
  revalidatePath("/app/projects");
  redirect(`/app/projects/${proj.id}`);
}

/**
 * Item 8: drafts a project name + description from a hint string.
 *
 * The hint can be: a Linear/GitHub URL, a repo name ("acme/mobile-app"), or a plain-English
 * description ("Mobile checkout flow for the consumer app"). Used by the optional "Help me name
 * this" pre-step on /app/projects/new.
 *
 * Note: never sends integration tokens — only the public-ish identifier the user types.
 */
export async function inferProjectFromHintAction(hint: string): Promise<{
  ok: boolean;
  name?: string;
  description?: string;
  confidence?: number;
  suggestionId?: number | null;
  error?: string;
}> {
  await requireUserId();
  const trimmed = hint.trim();
  if (trimmed.length < 4) return { ok: false, error: "too_short" };

  // Project doesn't exist yet — log the suggestion against project_id=0 (sentinel for "no target yet").
  // This still lets us audit how often the inference is invoked, even though the row isn't bound.
  const result = await draftFromContext<{ name: string; description: string }>({
    projectId: 0,
    kind: "project_infer",
    context: `User-supplied hint: ${trimmed}\n\nGenerate a short project name (max 40 chars) and a 1-2 sentence description.`,
    maxTokens: 400,
  });

  if (!result) return { ok: false, error: "ai_unavailable" };
  return {
    ok: true,
    name: result.draft.name,
    description: result.draft.description,
    confidence: result.confidence,
    suggestionId: result.suggestionId,
  };
}

/**
 * Returns connected integrations from the user's existing projects so the New Project page can
 * offer "import from integration" — useful when an org has e.g. several GitHub repos.
 *
 * Decrypts the integration row only to surface the *non-secret* fields (owner, repo, workspace name).
 * Secrets are never returned.
 */
export async function listInferableIntegrationsAction(): Promise<
  { id: number; sourceType: number; owner?: string; repo?: string }[]
> {
  const userId = await requireUserId();
  const db = await getRequestDb();
  const masterKey = process.env.LOCKBOX_MASTER_KEY?.trim();

  const rows = await db
    .select({
      id: integrations.id,
      sourceType: integrations.sourceType,
      ciphertext: integrations.credentialsCiphertext,
      projectId: integrations.projectId,
    })
    .from(integrations)
    .innerJoin(projectUsers, eq(projectUsers.projectId, integrations.projectId))
    .where(eq(projectUsers.userId, userId))
    .limit(50);

  const out: { id: number; sourceType: number; owner?: string; repo?: string }[] = [];
  for (const row of rows) {
    let owner: string | undefined;
    let repo: string | undefined;
    if (masterKey && row.ciphertext) {
      try {
        const decrypted = JSON.parse(decryptCredentialsColumn(row.ciphertext, masterKey)) as {
          owner?: string;
          repo?: string;
        };
        owner = decrypted.owner;
        repo = decrypted.repo;
      } catch {
        /* ignore — credentials may not be GitHub-shaped */
      }
    }
    out.push({ id: row.id, sourceType: row.sourceType, owner, repo });
  }
  return out;
}

export async function updateProjectAction(projectId: number, formData: FormData): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect("/app/projects");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) {
    redirect(`/app/projects/${projectId}/edit?error=name`);
  }

  const db = await getRequestDb();
  const now = new Date();
  let slug = slugifyName(name);
  const [conflict] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.slug, slug), ne(projects.id, projectId)))
    .limit(1);
  if (conflict) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  await db
    .update(projects)
    .set({ name, description, slug, updatedAt: now })
    .where(eq(projects.id, projectId));

  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${projectId}`);
  redirect(`/app/projects/${projectId}`);
}

export async function deleteProjectAction(projectId: number, _formData?: FormData): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect("/app/projects");
  }

  const db = await getRequestDb();
  await db.delete(projects).where(eq(projects.id, projectId));

  const cookieStore = await cookies();
  const cookie = cookieStore.get(CURRENT_PROJECT_COOKIE)?.value;
  if (cookie === String(projectId)) {
    cookieStore.delete(CURRENT_PROJECT_COOKIE);
  }

  revalidatePath("/app");
  revalidatePath("/app/projects");
  redirect("/app/projects");
}

export async function addProjectMemberAction(projectId: number, formData: FormData): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect(`/app/projects/${projectId}/members`);
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    redirect(`/app/projects/${projectId}/members?error=email`);
  }

  const db = await getRequestDb();
  const [target] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);

  const now = new Date();

  if (target) {
    // Existing user — add directly
    const [dup] = await db
      .select()
      .from(projectUsers)
      .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, target.id)))
      .limit(1);
    if (dup) {
      redirect(`/app/projects/${projectId}/members?error=dup`);
    }

    await db.insert(projectUsers).values({
      projectId,
      userId: target.id,
      invitedById: userId,
      isOwner: false,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // User doesn't exist yet — create pending invitation
    const [existingInvite] = await db
      .select()
      .from(projectInvitations)
      .where(and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.email, email)))
      .limit(1);
    if (existingInvite) {
      redirect(`/app/projects/${projectId}/members?error=dup_invite`);
    }

    await db.insert(projectInvitations).values({
      projectId,
      email,
      invitedById: userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath(`/app/projects/${projectId}/members`);
  redirect(`/app/projects/${projectId}/members`);
}

export async function cancelInvitationAction(
  projectId: number,
  invitationId: number,
  _formData?: FormData,
): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect(`/app/projects/${projectId}/members`);
  }

  const db = await getRequestDb();
  await db
    .delete(projectInvitations)
    .where(and(eq(projectInvitations.id, invitationId), eq(projectInvitations.projectId, projectId)));

  revalidatePath(`/app/projects/${projectId}/members`);
  redirect(`/app/projects/${projectId}/members`);
}

export async function removeProjectMemberAction(
  projectId: number,
  projectUserId: number,
  _formData?: FormData,
): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect(`/app/projects/${projectId}/members`);
  }

  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(projectUsers)
    .where(and(eq(projectUsers.id, projectUserId), eq(projectUsers.projectId, projectId)))
    .limit(1);
  if (!row || row.isOwner) {
    redirect(`/app/projects/${projectId}/members?error=remove`);
  }

  await db.delete(projectUsers).where(eq(projectUsers.id, projectUserId));

  revalidatePath(`/app/projects/${projectId}/members`);
  redirect(`/app/projects/${projectId}/members`);
}
