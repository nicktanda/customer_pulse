import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { Queue } from "bullmq";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import {
  reportingRequests,
  ReportingOutputMode,
  ReportingRequestStatus,
} from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { getRedis } from "@/lib/redis";
import { QUEUE_DEFAULT } from "@/lib/queue-names";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  outputMode: z.enum(["answer", "report_chart"]),
  /** How many days of context to include in the AI prompt (7, 30, or 90). Defaults to 30. */
  rangeDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 30;

/**
 * Queues a natural-language reporting job. Returns 202 + request id for polling.
 * Rate-limited per user to control Anthropic cost.
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

  const db = await getRequestDb();
  const hourAgo = new Date(Date.now() - RATE_WINDOW_MS);
  const [rateRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(reportingRequests)
    .where(
      and(eq(reportingRequests.userId, userId), gte(reportingRequests.createdAt, hourAgo)),
    );

  if ((rateRow?.c ?? 0) >= RATE_MAX) {
    return NextResponse.json(
      { error: "Rate limit exceeded — try again in a little while." },
      { status: 429 },
    );
  }

  const now = new Date();
  const outputMode =
    parsed.data.outputMode === "report_chart"
      ? ReportingOutputMode.report_chart
      : ReportingOutputMode.answer;

  const [inserted] = await db
    .insert(reportingRequests)
    .values({
      projectId,
      userId,
      prompt: parsed.data.prompt,
      outputMode,
      rangeDays: parsed.data.rangeDays,
      status: ReportingRequestStatus.pending,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: reportingRequests.id });

  const id = inserted?.id;
  if (id == null) {
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }

  try {
    const q = new Queue(QUEUE_DEFAULT, { connection: getRedis() });
    await q.add("reporting_nl", { requestId: id }, { removeOnComplete: 200, removeOnFail: 500 });
  } catch {
    // Redis down: mark failed so the UI does not spin forever
    await db
      .update(reportingRequests)
      .set({
        status: ReportingRequestStatus.failed,
        errorMessage: "Could not enqueue job — is Redis running?",
        updatedAt: new Date(),
      })
      .where(eq(reportingRequests.id, id));
    return NextResponse.json(
      { error: "Queue unavailable — start Redis and the worker, then try again.", id },
      { status: 503 },
    );
  }

  return NextResponse.json({ id, status: "pending" }, { status: 202 });
}
