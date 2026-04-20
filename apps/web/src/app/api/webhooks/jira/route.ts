import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { feedbacks, integrations, IntegrationSourceType, FeedbackSource } from "@customer-pulse/db/client";
import { getRequestDb, isMultiTenant } from "@/lib/db";
import { verifyJiraSignature } from "@/lib/webhook-crypto";
import { jiraPriorityNameToEnum } from "@/lib/jira-priority";

export const runtime = "nodejs";

function buildContent(fields: Record<string, unknown>): string {
  const parts: string[] = [];
  const desc = fields.description;
  if (typeof desc === "string") {
    parts.push(desc);
  } else if (desc && typeof desc === "object") {
    parts.push(JSON.stringify(desc));
  }
  const labels = fields.labels as string[] | undefined;
  if (labels?.length) {
    parts.push(`Labels: ${labels.join(", ")}`);
  }
  const issueType = fields.issuetype as { name?: string } | undefined;
  if (issueType?.name) {
    parts.push(`Type: ${issueType.name}`);
  }
  return parts.join("\n\n") || "(no description)";
}

export async function POST(request: Request) {
  if (isMultiTenant()) {
    return NextResponse.json(
      { error: "This workspace uses per-tenant webhooks. POST to /api/webhooks/jira/<tenant-slug> instead." },
      { status: 410 },
    );
  }
  const rawBody = await request.text();
  const db = await getRequestDb();

  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.sourceType, IntegrationSourceType.jira), eq(integrations.enabled, true)))
    .limit(1);

  if (!integration) {
    return NextResponse.json({ status: "ok" });
  }

  const sig = request.headers.get("x-hub-signature") ?? request.headers.get("x-atlassian-webhook-signature");
  if (integration.webhookSecret && !verifyJiraSignature(rawBody, integration.webhookSecret, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch (e) {
    return NextResponse.json({ error: `Invalid JSON: ${e}` }, { status: 400 });
  }

  const eventType = payload.webhookEvent as string | undefined;
  try {
    if (eventType === "jira:issue_created" || eventType === "jira:issue_updated") {
      await syncIssue(db, integration.projectId, payload.issue as Record<string, unknown>);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  return NextResponse.json({ status: "ok" });
}

async function syncIssue(db: Awaited<ReturnType<typeof getRequestDb>>, projectId: number, issue: Record<string, unknown> | undefined) {
  if (!issue) {
    return;
  }
  const key = issue.key as string | undefined;
  const fields = issue.fields as Record<string, unknown> | undefined;
  if (!key || !fields) {
    return;
  }

  const summary = (fields.summary as string) ?? key;
  const content = buildContent(fields);
  const reporter = fields.reporter as { displayName?: string; emailAddress?: string } | undefined;
  const priority = jiraPriorityNameToEnum(fields.priority && (fields.priority as { name?: string }).name);
  const now = new Date();

  const existing = await db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.source, FeedbackSource.jira), eq(feedbacks.sourceExternalId, key)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(feedbacks)
      .set({
        title: summary,
        content,
        authorName: reporter?.displayName ?? null,
        authorEmail: reporter?.emailAddress ?? null,
        priority,
        rawData: issue,
        updatedAt: now,
      })
      .where(eq(feedbacks.id, existing[0].id));
  } else {
    await db.insert(feedbacks).values({
      projectId,
      source: FeedbackSource.jira,
      sourceExternalId: key,
      title: summary,
      content,
      authorName: reporter?.displayName ?? null,
      authorEmail: reporter?.emailAddress ?? null,
      priority,
      rawData: issue,
      createdAt: now,
      updatedAt: now,
    });
  }
}
