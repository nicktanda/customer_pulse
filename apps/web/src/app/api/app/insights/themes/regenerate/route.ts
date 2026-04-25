import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { auth } from "@/auth";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { getRedis } from "@/lib/redis";
import { QUEUE_DEFAULT } from "@/lib/queue-names";

export const runtime = "nodejs";

/**
 * POST /api/app/insights/themes/regenerate
 *
 * Enqueues a one-off theme analysis job for the current user's project.
 * The worker will call identifyThemes(db, projectId) which groups the
 * project's insights into AI-generated themes and saves them to the DB.
 *
 * Returns 202 Accepted immediately — the job runs in the background.
 * The UI should poll or reload after a few seconds to see updated themes.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const redis = await getRedis();
  const queue = new Queue(QUEUE_DEFAULT, { connection: redis });

  // Enqueue as a one-off job (no repeat). The worker picks it up and runs
  // identifyThemes for this specific project only.
  await queue.add("RegenerateThemesForProjectJob", { projectId });

  return NextResponse.json({ ok: true, projectId }, { status: 202 });
}
