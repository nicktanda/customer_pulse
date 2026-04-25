import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { pinnedReportCharts } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";

export const runtime = "nodejs";

/**
 * DELETE /api/app/reporting/pin/:id
 * Removes a pinned chart. The requester must be the project member who pinned it,
 * or any project member (we treat any project member as able to manage pins).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const pinnedId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(pinnedId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getRequestDb();

  // Delete only if the pinned chart belongs to the user's current project.
  const deleted = await db
    .delete(pinnedReportCharts)
    .where(
      and(
        eq(pinnedReportCharts.id, pinnedId),
        eq(pinnedReportCharts.projectId, projectId),
      ),
    )
    .returning({ id: pinnedReportCharts.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
