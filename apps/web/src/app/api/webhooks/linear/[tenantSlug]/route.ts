import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  feedbacks,
  integrations,
  IntegrationSourceType,
  FeedbackSource,
  FeedbackCategory,
  FeedbackPriority,
} from "@customer-pulse/db/client";
import { getDb } from "@/lib/db";
import { resolveTenantBySlug } from "@/lib/resolve-tenant";
import { verifyLinearSignature } from "@/lib/webhook-crypto";

export const runtime = "nodejs";

function linearPriorityToEnum(p: unknown): number {
  const n = Number(p);
  switch (n) {
    case 1:
      return FeedbackPriority.p1;
    case 2:
      return FeedbackPriority.p2;
    case 3:
      return FeedbackPriority.p3;
    case 4:
      return FeedbackPriority.p4;
    default:
      return FeedbackPriority.unset;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
  }

  const rawBody = await request.text();
  const db = getDb(tenant);

  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.sourceType, IntegrationSourceType.linear), eq(integrations.enabled, true)))
    .limit(1);

  if (!integration) {
    return NextResponse.json({ error: "No Linear integration configured" }, { status: 401 });
  }

  const sig = request.headers.get("linear-signature");
  if (integration.webhookSecret && !verifyLinearSignature(rawBody, integration.webhookSecret, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { action?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch (e) {
    return NextResponse.json({ error: `Invalid JSON: ${e}` }, { status: 400 });
  }

  const action = payload.action;
  if (action === "create" || action === "update") {
    await processIssue(db, integration.projectId, payload.data);
  }

  return NextResponse.json({ status: "ok" });
}

async function processIssue(db: ReturnType<typeof getDb>, projectId: number, data: Record<string, unknown> | undefined) {
  if (!data?.id) {
    return;
  }
  const externalId = String(data.id);
  const now = new Date();

  const labels = (data.labels as { name?: string }[] | undefined) ?? [];
  const labelNames = labels.map((l) => (l.name ?? "").toLowerCase());
  let category: number = FeedbackCategory.uncategorized;
  if (labelNames.includes("bug")) {
    category = FeedbackCategory.bug;
  } else if (labelNames.includes("feature") || labelNames.includes("enhancement")) {
    category = FeedbackCategory.feature_request;
  }

  const priority: number = linearPriorityToEnum(data.priority);

  const title = (data.title as string) ?? "";
  const content = (data.description as string) || title;
  const creator = data.creator as { name?: string; email?: string } | undefined;

  const existing = await db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.source, FeedbackSource.linear), eq(feedbacks.sourceExternalId, externalId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(feedbacks)
      .set({
        title,
        content,
        authorName: creator?.name ?? null,
        authorEmail: creator?.email ?? null,
        category,
        priority,
        rawData: data as Record<string, unknown>,
        updatedAt: now,
      })
      .where(eq(feedbacks.id, existing[0].id));
  } else {
    await db.insert(feedbacks).values({
      projectId,
      source: FeedbackSource.linear,
      sourceExternalId: externalId,
      title,
      content,
      authorName: creator?.name ?? null,
      authorEmail: creator?.email ?? null,
      category,
      priority,
      status: 0,
      rawData: data as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    });
  }
}
