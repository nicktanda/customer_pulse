import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { reportingRequests, pinnedReportCharts } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { parseReportStructured } from "@/lib/reporting-structured";

export const runtime = "nodejs";

const bodySchema = z.object({
  /** The reporting_requests row that produced the chart. */
  requestId: z.number().int().positive(),
  /** Index of the chart within result_structured.charts to pin. */
  chartIndex: z.number().int().min(0),
});

/**
 * POST /api/app/reporting/pin
 * Pins a specific chart from a completed reporting request to the project's Reporting page.
 * The chart JSON is snapshotted at pin time (denormalised) so it remains stable as data changes.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { requestId, chartIndex } = parsed.data;
  const db = await getRequestDb();

  // Load the source reporting request and verify it belongs to the same project.
  const [row] = await db
    .select()
    .from(reportingRequests)
    .where(eq(reportingRequests.id, requestId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (row.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const structured = parseReportStructured(row.resultStructured);
  if (!structured) {
    return NextResponse.json({ error: "Request has no chart data" }, { status: 422 });
  }

  const chart = structured.charts[chartIndex];
  if (!chart) {
    return NextResponse.json({ error: `Chart index ${chartIndex} not found` }, { status: 422 });
  }

  const title = chart.title ?? `Chart ${chartIndex + 1}`;
  const now = new Date();

  const [inserted] = await db
    .insert(pinnedReportCharts)
    .values({
      projectId,
      createdBy: userId,
      title,
      prompt: row.prompt,
      // Cast to satisfy the jsonb column type — chart is a plain serialisable object.
      chartJson: chart as unknown as Record<string, unknown>,
      narrative: structured.narrative,
      rangeDays: row.rangeDays,
      pinnedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: pinnedReportCharts.id });

  return NextResponse.json({ id: inserted?.id }, { status: 201 });
}
