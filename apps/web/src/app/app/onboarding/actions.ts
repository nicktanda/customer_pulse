"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getUserAuthDb, getRequestDb, isMultiTenant } from "@/lib/db";
import {
  projects,
  projectUsers,
  projectInvitations,
  emailRecipients,
  IntegrationSourceType,
} from "@customer-pulse/db/client";
import { nextOnboardingStep, ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { slugifyName } from "@/app/app/projects/slug";
import { upsertIntegrationCredentials } from "@/lib/integrations-upsert";
import { cookies } from "next/headers";
import { CURRENT_PROJECT_COOKIE } from "@/lib/current-project";
import { provisionTenant, slugify } from "@/lib/tenant-provisioning";
import { createDb } from "@customer-pulse/db/client";

function onboardingDestination(slug?: string): string {
  // Mirror the logic in app/layout.tsx so MT users land on their tenant subdomain and
  // dev callers pick up `?tenant=slug` instead.
  const baseDomain = process.env.APP_BASE_DOMAIN ?? "customerpulse.app";
  if (!slug) return "/app/onboarding";

  if (process.env.NODE_ENV === "development" || baseDomain.startsWith("localhost")) {
    const proto = process.env.NEXTAUTH_URL?.split("://")[0] ?? "http";
    return `${proto}://${baseDomain}/app?tenant=${encodeURIComponent(slug)}`;
  }
  const proto = baseDomain.includes(":") ? "http" : "https";
  return `${proto}://${slug}.${baseDomain}/app`;
}

/** Single entry: each step form posts here with hidden `_onboarding_step`. */
export async function onboardingDispatchAction(formData: FormData): Promise<void> {
  const step = String(formData.get("_onboarding_step") ?? "");
  const skip = formData.get("skip") === "1";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);

  const { db: userDb, usersTable } = getUserAuthDb();
  const [user] = await userDb.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.id || user.onboardingCompletedAt) {
    redirect("/app");
  }

  const current = user.onboardingCurrentStep ?? "welcome";
  if (current !== step && step !== "complete") {
    redirect("/app/onboarding");
  }

  async function setStep(next: string) {
    await userDb
      .update(usersTable)
      .set({ onboardingCurrentStep: next, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
    revalidatePath("/app/onboarding");
    redirect("/app/onboarding");
  }

  async function markComplete() {
    const now = new Date();
    await userDb
      .update(usersTable)
      .set({
        onboardingCompletedAt: now,
        onboardingCurrentStep: "complete",
        updatedAt: now,
      })
      .where(eq(usersTable.id, userId));
    revalidatePath("/app");
  }

  // Multi-tenant: compressed flow that provisions a tenant on the "project" step.
  if (isMultiTenant()) {
    switch (step) {
      case "welcome": {
        await setStep("project");
        return;
      }
      case "project": {
        const name = String(formData.get("project_name") ?? "").trim();
        if (!name) {
          redirect("/app/onboarding?error=project_name");
        }

        const baseSlug = slugify(name) || `workspace-${Date.now().toString(36)}`;
        // Ensure slug uniqueness against existing tenants.
        const { tenants } = await import("@customer-pulse/db/control-plane");
        const { getControlPlaneDb } = await import("@/lib/db");
        const cpDb = getControlPlaneDb();
        let slug = baseSlug;
        for (let attempt = 0; attempt < 5; attempt++) {
          const [dup] = await cpDb.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
          if (!dup) break;
          slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        }

        const { tenantId, connectionString } = await provisionTenant({
          name,
          slug,
          ownerUserId: userId,
        });

        // Seed a default project inside the tenant DB so the rest of the app has
        // a project context to work against.
        const tenantDb = createDb(connectionString);
        const now = new Date();
        const [proj] = await tenantDb
          .insert(projects)
          .values({ name, description: null, slug: slugifyName(name), createdAt: now, updatedAt: now })
          .returning({ id: projects.id });
        if (proj) {
          await tenantDb.insert(projectUsers).values({
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
            domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
          });
        }

        await markComplete();
        void tenantId;
        redirect(onboardingDestination(slug));
        return;
      }
      case "complete": {
        await markComplete();
        redirect("/app");
        return;
      }
      default: {
        // Any other single-tenant step lands in MT mode → skip straight to the tenant step.
        await setStep("project");
        return;
      }
    }
  }

  // --- Single-tenant path (original long wizard) -----------------------------------
  const db = await getRequestDb();

  async function firstProjectId(): Promise<number | null> {
    const [row] = await db
      .select({ projectId: projectUsers.projectId })
      .from(projectUsers)
      .where(eq(projectUsers.userId, userId))
      .limit(1);
    return row?.projectId ?? null;
  }

  switch (step) {
    case "welcome": {
      await setStep(nextOnboardingStep("welcome"));
      return;
    }

    case "project": {
      const name = String(formData.get("project_name") ?? "").trim();
      if (!name) {
        redirect("/app/onboarding?error=project_name");
      }
      let projectId = await firstProjectId();
      const now = new Date();
      if (projectId == null) {
        let slug = slugifyName(name);
        const [hit] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1);
        if (hit) {
          slug = `${slug}-${Date.now().toString(36)}`;
        }
        const [proj] = await db
          .insert(projects)
          .values({ name, description: null, slug, createdAt: now, updatedAt: now })
          .returning({ id: projects.id });
        if (!proj) {
          redirect("/app/onboarding?error=project");
        }
        projectId = proj.id;
        await db.insert(projectUsers).values({
          projectId,
          userId,
          isOwner: true,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db
          .update(projects)
          .set({ name, updatedAt: now })
          .where(eq(projects.id, projectId));
      }

      const cookieStore = await cookies();
      cookieStore.set(CURRENT_PROJECT_COOKIE, String(projectId), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 400,
      });

      await setStep(nextOnboardingStep("project"));
      return;
    }

    case "team": {
      if (!skip) {
        const pid = await firstProjectId();
        const email = String(formData.get("member_email") ?? "")
          .trim()
          .toLowerCase();
        if (pid != null && email) {
          const { users: tenantUsers } = await import("@customer-pulse/db/client");
          const [target] = await db.select().from(tenantUsers).where(sql`lower(${tenantUsers.email}) = ${email}`).limit(1);
          if (target) {
            const [dup] = await db
              .select()
              .from(projectUsers)
              .where(and(eq(projectUsers.projectId, pid), eq(projectUsers.userId, target.id)))
              .limit(1);
            if (!dup) {
              await db.insert(projectUsers).values({
                projectId: pid,
                userId: target.id,
                invitedById: userId,
                isOwner: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          } else {
            try {
              await db.insert(projectInvitations).values({
                projectId: pid,
                email,
                invitedById: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            } catch {
              // Unique constraint (duplicate invite) — safe to ignore
            }
          }
        }
      }
      await setStep(nextOnboardingStep("team"));
      return;
    }

    case "anthropic_api": {
      if (!skip) {
        const apiKey = String(formData.get("anthropic_api_key") ?? "").trim();
        if (apiKey) {
          const pid = await firstProjectId();
          if (pid != null) {
            await upsertIntegrationCredentials(pid, 13, "Anthropic", { api_key: apiKey }, { db });
          }
        }
      }
      await setStep(nextOnboardingStep("anthropic_api"));
      return;
    }

    case "linear":
    case "slack":
    case "jira":
    case "google_forms":
    case "gong":
    case "logrocket":
    case "fullstory":
    case "intercom":
    case "zendesk":
    case "sentry":
    case "github": {
      if (!skip) {
        const pid = await firstProjectId();
        if (pid == null) {
          redirect("/app/onboarding?error=noproject");
        }
        const credsJson = String(formData.get("credentials_json") ?? "").trim();
        if (credsJson) {
          let obj: Record<string, unknown>;
          try {
            obj = JSON.parse(credsJson) as Record<string, unknown>;
          } catch {
            redirect("/app/onboarding?error=json");
          }
          const map: Record<string, { type: number; name: string }> = {
            linear: { type: IntegrationSourceType.linear, name: "Linear" },
            slack: { type: IntegrationSourceType.slack, name: "Slack" },
            jira: { type: IntegrationSourceType.jira, name: "Jira" },
            google_forms: { type: IntegrationSourceType.google_forms, name: "Google Forms" },
            gong: { type: IntegrationSourceType.gong, name: "Gong" },
            logrocket: { type: IntegrationSourceType.logrocket, name: "LogRocket" },
            fullstory: { type: IntegrationSourceType.fullstory, name: "FullStory" },
            intercom: { type: IntegrationSourceType.intercom, name: "Intercom" },
            zendesk: { type: IntegrationSourceType.zendesk, name: "Zendesk" },
            sentry: { type: IntegrationSourceType.sentry, name: "Sentry" },
            github: { type: IntegrationSourceType.github, name: "GitHub" },
          };
          const cfg = map[step];
          if (cfg) {
            await upsertIntegrationCredentials(pid, cfg.type, cfg.name, obj, { db });
          }
        }
      }
      await setStep(nextOnboardingStep(step));
      return;
    }

    case "recipients": {
      if (!skip) {
        const pid = await firstProjectId();
        const email = String(formData.get("recipient_email") ?? "")
          .trim()
          .toLowerCase();
        if (pid != null && email) {
          const now = new Date();
          try {
            await db.insert(emailRecipients).values({
              projectId: pid,
              email,
              name: String(formData.get("recipient_name") ?? "").trim() || null,
              active: true,
              createdAt: now,
              updatedAt: now,
            });
          } catch {
            // Duplicate project+email membership — unique index makes this safe to ignore.
          }
        }
      }
      await setStep(nextOnboardingStep("recipients"));
      return;
    }

    case "complete": {
      await markComplete();
      redirect("/app");
      return;
    }

    default:
      redirect("/app/onboarding");
  }
}

export async function onboardingGoBackAction(formData: FormData): Promise<void> {
  const step = String(formData.get("_onboarding_step") ?? "");
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const { db: userDb, usersTable } = getUserAuthDb();
  const [user] = await userDb.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.id || user.onboardingCompletedAt) {
    redirect("/app");
  }
  const i = ONBOARDING_STEPS.indexOf(step as (typeof ONBOARDING_STEPS)[number]);
  if (i <= 0) {
    redirect("/app/onboarding");
  }
  const prev = ONBOARDING_STEPS[i - 1]!;
  await userDb
    .update(usersTable)
    .set({ onboardingCurrentStep: prev, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
  revalidatePath("/app/onboarding");
  redirect("/app/onboarding");
}

/** Skip the current step — wraps dispatch with skip=1 so buttons don't need a name prop. */
export async function onboardingSkipAction(formData: FormData): Promise<void> {
  const newFormData = new FormData();
  newFormData.set("_onboarding_step", formData.get("_onboarding_step") as string);
  newFormData.set("skip", "1");
  return onboardingDispatchAction(newFormData);
}
