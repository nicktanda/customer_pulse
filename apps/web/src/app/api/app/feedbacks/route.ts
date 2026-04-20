import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbacks } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";

export const runtime = "nodejs";

/** Internal JSON API for the current project only (scoped by session + project cookie). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null) {
    return NextResponse.json({ feedbacks: [] });
  }

  const db = await getRequestDb();
  const rows = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.projectId, projectId))
    .orderBy(desc(feedbacks.createdAt))
    .limit(100);

  return NextResponse.json({ feedbacks: rows });
}
