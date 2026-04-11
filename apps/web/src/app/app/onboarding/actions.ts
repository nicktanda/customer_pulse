"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users, projects, projectUsers, emailRecipients, IntegrationSourceType } from "@customer-pulse/db/client";
import { nextOnboardingStep, ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { slugifyName } from "@/app/app/projects/slug";
import { upsertIntegrationCredentials } from "@/lib/integrations-upsert";
import { cookies } from "next/headers";
import { CURRENT_PROJECT_COOKIE } from "@/lib/current-project";

/** Single entry: each step form posts here with hidden `_onboarding_step`. */
export async function onboardingDispatchAction(formData: FormData): Promise<void> {
  const step = String(formData.get("_onboarding_step") ?? "");
  const skip = formData.get("skip") === "1";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.id || user.onboardingCompletedAt) {
    redirect("/app");
  }

  const current = user.onboardingCurrentStep ?? "welcome";
  if (current !== step && step !== "complete") {
    redirect("/app/onboarding");
  }

  async function firstProjectId(): Promise<number | null> {
    const [row] = await db
      .select({ projectId: projectUsers.projectId })
      .from(projectUsers)
      .where(eq(projectUsers.userId, userId))
      .limit(1);
    return row?.projectId ?? null;
  }

  async function setStep(next: string) {
    await db
      .update(users)
      .set({ onboardingCurrentStep: next, updatedAt: new Date() })
      .where(eq(users.id, userId));
    revalidatePath("/app/onboarding");
    redirect("/app/onboarding");
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
          const [target] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
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
          }
        }
      }
      await setStep(nextOnboardingStep("team"));
      return;
    }

    case "anthropic_api": {
      if (!skip && !process.env.ANTHROPIC_API_KEY?.trim()) {
        redirect("/app/onboarding?error=anthropic_env");
      }
      await setStep(nextOnboardingStep("anthropic_api"));
      return;
    }

    case "linear":
    case "slack":
    case "jira":
    case "google_forms":
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
            logrocket: { type: IntegrationSourceType.logrocket, name: "LogRocket" },
            fullstory: { type: IntegrationSourceType.fullstory, name: "FullStory" },
            intercom: { type: IntegrationSourceType.intercom, name: "Intercom" },
            zendesk: { type: IntegrationSourceType.zendesk, name: "Zendesk" },
            sentry: { type: IntegrationSourceType.sentry, name: "Sentry" },
            github: { type: IntegrationSourceType.github, name: "GitHub" },
          };
          const cfg = map[step];
          if (cfg) {
            await upsertIntegrationCredentials(pid, cfg.type, cfg.name, obj);
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
      const now = new Date();
      await db
        .update(users)
        .set({
          onboardingCompletedAt: now,
          onboardingCurrentStep: "complete",
          updatedAt: now,
        })
        .where(eq(users.id, userId));
      revalidatePath("/app");
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
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.id || user.onboardingCompletedAt) {
    redirect("/app");
  }
  const i = ONBOARDING_STEPS.indexOf(step as (typeof ONBOARDING_STEPS)[number]);
  if (i <= 0) {
    redirect("/app/onboarding");
  }
  const prev = ONBOARDING_STEPS[i - 1]!;
  await db
    .update(users)
    .set({ onboardingCurrentStep: prev, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/app/onboarding");
  redirect("/app/onboarding");
}
