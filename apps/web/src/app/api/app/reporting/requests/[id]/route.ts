import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { reportingRequests, ReportingOutputMode, ReportingRequestStatus } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";

export const runtime = "nodejs";

function statusLabel(s: number): string {
  switch (s) {
    case ReportingRequestStatus.pending:
      return "pending";
    case ReportingRequestStatus.running:
      return "running";
    case ReportingRequestStatus.done:
      return "done";
    case ReportingRequestStatus.failed:
      return "failed";
    default:
      return "unknown";
  }
}

function outputModeLabel(m: number): string {
  return m === ReportingOutputMode.report_chart ? "report_chart" : "answer";
}

/** Poll a single NL reporting job by id (must belong to current project). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(reportingRequests)
    .where(and(eq(reportingRequests.id, id), eq(reportingRequests.projectId, projectId)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    status: statusLabel(row.status),
    statusCode: row.status,
    outputMode: outputModeLabel(row.outputMode),
    prompt: row.prompt,
    resultMarkdown: row.resultMarkdown,
    resultStructured: row.resultStructured,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
