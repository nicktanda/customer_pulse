import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { feedbacks, integrations, IntegrationSourceType, FeedbackSource } from "@customer-pulse/db/client";
import { getDb } from "@/lib/db";
import { verifySlackSignature } from "@/lib/webhook-crypto";

export const runtime = "nodejs";

const KEYWORDS = ["feedback", "bug", "issue", "problem", "feature", "request", "suggestion"];

function shouldCaptureFeedback(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORDS.some((k) => lower.includes(k));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? "";

  const ts = request.headers.get("x-slack-request-timestamp");
  const sig = request.headers.get("x-slack-signature");
  if (!verifySlackSignature(rawBody, signingSecret, ts, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let payload: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } else {
    const params = new URLSearchParams(rawBody);
    const p = params.get("payload");
    payload = p ? (JSON.parse(p) as Record<string, unknown>) : {};
  }

  if (payload.type === "url_verification" && typeof payload.challenge === "string") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type === "event_callback") {
    const event = payload.event as Record<string, unknown> | undefined;
    if (event?.type === "message") {
      await processMessage(event);
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function processMessage(event: Record<string, unknown>) {
  if (event.bot_id) {
    return;
  }
  const text = (event.text as string) || "";
  if (!shouldCaptureFeedback(text)) {
    return;
  }

  const db = getDb();
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.sourceType, IntegrationSourceType.slack), eq(integrations.enabled, true)))
    .limit(1);

  if (!integration) {
    return;
  }

  const channel = String(event.channel ?? "");
  const ts = String(event.ts ?? "");
  const externalId = `${channel}-${ts}`;

  const dup = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(and(eq(feedbacks.source, FeedbackSource.slack), eq(feedbacks.sourceExternalId, externalId)))
    .limit(1);
  if (dup[0]) {
    return;
  }

  const title = text.length > 100 ? `${text.slice(0, 100)}…` : text;
  const now = new Date();

  await db.insert(feedbacks).values({
    projectId: integration.projectId,
    source: FeedbackSource.slack,
    sourceExternalId: externalId,
    title,
    content: text,
    authorName: (event.user as string) ?? null,
    rawData: event,
    createdAt: now,
    updatedAt: now,
  });
}
