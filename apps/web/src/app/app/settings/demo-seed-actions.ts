"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { removeDemoDataForProject, seedDemoDataForProject } from "@/lib/demo-project-seed";
import { UserRole } from "@customer-pulse/db/client";

/** Same paths as dashboard data that demo seed creates or removes. */
function revalidateAfterDemoDataChange() {
  revalidatePath("/app");
  revalidatePath("/app/learn/feedback");
  revalidatePath("/app/learn/insights");
  revalidatePath("/app/reporting");
  revalidatePath("/app/pulse-reports");
  revalidatePath("/app/strategy");
  revalidatePath("/app/recipients");
  revalidatePath("/app/integrations");
  revalidatePath("/app/settings");
}

/**
 * Turn **demo mode** on (seed synthetic rows) or off (delete tagged demo rows only).
 * Gated by `ALLOW_DEMO_DATA_SEED=true` and **admin** users only so production stays safe by default.
 */
export async function setDemoModeAction(enabled: boolean): Promise<void> {
  if (process.env.ALLOW_DEMO_DATA_SEED !== "true") {
    redirect("/app/settings?error=demo_disabled");
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  if (!session?.user?.id || session.user.role !== UserRole.admin) {
    redirect("/app/settings?error=demo_forbidden");
  }

  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null) {
    redirect("/app/settings?error=demo_noproject");
  }

  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/settings?error=demo_forbidden");
  }

  const db = await getRequestDb();
  if (enabled) {
    await seedDemoDataForProject(db, { projectId, userId });
    revalidateAfterDemoDataChange();
    redirect("/app/settings?notice=demo_on");
  }

  await removeDemoDataForProject(db, projectId);
  revalidateAfterDemoDataChange();
  redirect("/app/settings?notice=demo_off");
}
