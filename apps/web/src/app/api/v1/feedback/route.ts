import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  feedbacks,
  integrations,
  IntegrationSourceType,
  FeedbackSource,
  FeedbackStatus,
} from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { getRequestDb, isMultiTenant, getDb } from "@/lib/db";
import { resolveTenantBySlug } from "@/lib/resolve-tenant";
import { publicFeedbackIngestBodySchema } from "@/lib/feedback-public-api-body";
import { secureCompare } from "@/lib/secure-compare";
import { coerceCategory, coercePriority } from "@/lib/feedback-fields";
import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";
import { QUEUE_DEFAULT } from "@/lib/queue-names";

export const runtime = "nodejs";

/**
 * Public API: stable JSON contract for programmatic feedback ingestion.
 * Auth: `X-API-Key` header or `api_key` query — matched against custom integration credentials.
 */
export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key") ?? new URL(request.url).searchParams.get("api_key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const masterKey = process.env.LOCKBOX_MASTER_KEY;
  if (!masterKey) {
    return NextResponse.json({ error: "Server misconfigured (LOCKBOX_MASTER_KEY)" }, { status: 500 });
  }

  // Multi-tenant: clients must name the workspace explicitly via header or `?tenant=`.
  // Without it, an API key alone can't target one tenant DB out of many.
  let db: Awaited<ReturnType<typeof getRequestDb>>;
  if (isMultiTenant()) {
    const tenantSlug =
      request.headers.get("x-tenant-slug") ?? new URL(request.url).searchParams.get("tenant");
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Multi-tenant mode requires an X-Tenant-Slug header or ?tenant= query parameter." },
        { status: 400 },
      );
    }
    const tenant = await resolveTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    db = getDb({ slug: tenant.slug, connectionString: tenant.connectionString });
  } else {
    db = await getRequestDb();
  }
  const candidates = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.sourceType, IntegrationSourceType.custom), eq(integrations.enabled, true)));

  let integration: (typeof candidates)[0] | undefined;
  for (const row of candidates) {
    try {
      const raw = decryptCredentialsColumn(row.credentialsCiphertext, masterKey);
      if (!raw) {
        continue;
      }
      const creds = JSON.parse(raw) as { api_key?: string };
      if (creds.api_key && secureCompare(String(creds.api_key), apiKey)) {
        integration = row;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!integration) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = publicFeedbackIngestBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 422 });
  }

  const b = parsed.data;
  const now = new Date();

  let row: { id: number };
  try {
    const inserted = await db
      .insert(feedbacks)
      .values({
        projectId: integration.projectId,
        source: FeedbackSource.custom,
        sourceExternalId: b.external_id ?? null,
        title: b.title ?? null,
        content: b.content,
        authorName: b.author_name ?? null,
        authorEmail: b.author_email ?? null,
        category: coerceCategory(b.category),
        priority: coercePriority(b.priority),
        status: FeedbackStatus.new_feedback,
        rawData: b.raw_data ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: feedbacks.id });
    row = inserted[0]!;
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "Duplicate source_external_id for this source" }, { status: 422 });
    }
    throw e;
  }

  try {
    const q = new Queue(QUEUE_DEFAULT, { connection: getRedis() });
    await q.add(
      "process_feedback",
      { feedbackId: row.id },
      { removeOnComplete: 1000, removeOnFail: 5000 },
    );
  } catch {
    // Queue optional during local dev without Redis
  }

  return NextResponse.json({
    status: "ok",
    id: row.id,
    message: "Feedback created successfully",
  });
}
