import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import {
  feedbacks,
  insights,
  reportingRequests,
  themes,
  ReportingOutputMode,
  ReportingRequestStatus,
} from "@customer-pulse/db/client";
import { type ReportStructured, reportStructuredSchema, stripJsonFence } from "./reporting-structured.js";

const CONTEXT_RANGE_DAYS = 30;
const MAX_SNIPPETS = 12;
const SNIPPET_LEN = 220;

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * Fixed, allowlisted stats + tiny text samples — never send full feedback history to the model.
 */
export async function buildReportingContextBundle(db: Database, projectId: number): Promise<string> {
  const start = new Date(Date.now() - CONTEXT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  const dayTrunc = sql`date_trunc('day', ${feedbacks.createdAt})`;

  const [totalRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)));

  const dailyRows = await db
    .select({
      day: sql<string>`to_char(${dayTrunc}, 'YYYY-MM-DD')`,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(dayTrunc)
    .orderBy(dayTrunc);

  const categoryRows = await db
    .select({
      category: feedbacks.category,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(feedbacks.category);

  const priorityRows = await db
    .select({
      priority: feedbacks.priority,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(feedbacks.priority);

  const sourceRows = await db
    .select({
      source: feedbacks.source,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(feedbacks.source);

  const snippets = await db
    .select({
      id: feedbacks.id,
      title: feedbacks.title,
      aiSummary: feedbacks.aiSummary,
      content: feedbacks.content,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .orderBy(desc(feedbacks.createdAt))
    .limit(MAX_SNIPPETS);

  const themeRows = await db
    .select({ name: themes.name, priorityScore: themes.priorityScore })
    .from(themes)
    .where(and(eq(themes.projectId, projectId), gte(themes.createdAt, start)))
    .orderBy(desc(themes.priorityScore))
    .limit(8);

  const insightRows = await db
    .select({ title: insights.title, description: insights.description })
    .from(insights)
    .where(and(eq(insights.projectId, projectId), gte(insights.createdAt, start)))
    .orderBy(desc(insights.createdAt))
    .limit(8);

  const bundle = {
    windowDays: CONTEXT_RANGE_DAYS,
    feedbackCountInWindow: totalRow?.c ?? 0,
    dailyVolume: dailyRows.map((r) => ({ day: r.day, count: r.c })),
    byCategory: categoryRows.map((r) => ({ category: r.category, count: r.c })),
    byPriority: priorityRows.map((r) => ({ priority: r.priority, count: r.c })),
    bySource: sourceRows.map((r) => ({ source: r.source, count: r.c })),
    recentSnippets: snippets.map((s) => ({
      id: s.id,
      title: s.title,
      summaryOrExcerpt: truncate(s.aiSummary ?? s.content ?? "", SNIPPET_LEN),
      createdAt: s.createdAt?.toISOString?.() ?? "",
    })),
    topThemes: themeRows.map((t) => ({ name: t.name, score: t.priorityScore })),
    recentInsights: insightRows.map((i) => ({
      title: i.title,
      description: truncate(i.description, SNIPPET_LEN),
    })),
  };

  return JSON.stringify(bundle, null, 2);
}

async function callAnthropic(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return "ANTHROPIC_API_KEY is not set — configure it to enable natural-language reporting.";
  }
  const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const json = (await res.json()) as { content?: { type: string; text?: string }[]; error?: { message?: string } };
  if (!res.ok) {
    return `Anthropic error (${res.status}): ${json.error?.message ?? "unknown"}`;
  }
  const text = json.content?.find((c) => c.type === "text")?.text;
  return text ?? "(empty response)";
}

export async function processReportingNlJob(db: Database, requestId: number): Promise<void> {
  const now = new Date();
  const claim = await db
    .update(reportingRequests)
    .set({ status: ReportingRequestStatus.running, updatedAt: now })
    .where(
      and(
        eq(reportingRequests.id, requestId),
        eq(reportingRequests.status, ReportingRequestStatus.pending),
      ),
    )
    .returning({ id: reportingRequests.id });

  if (claim.length === 0) {
    return;
  }

  const [row] = await db.select().from(reportingRequests).where(eq(reportingRequests.id, requestId)).limit(1);
  if (!row) {
    return;
  }

  try {
    const contextJson = await buildReportingContextBundle(db, row.projectId);
    const isReport = row.outputMode === ReportingOutputMode.report_chart;

    if (isReport) {
      const system = `You are an analytics assistant for a PM. You receive ONLY aggregated JSON about customer feedback for one product workspace. 
Do not invent numbers — use only facts from the JSON. 
The user will ask for a short report and chart-ready data.
Respond with a single JSON object (no markdown fences) matching exactly this shape:
{"narrative": string, "charts": array of {"title"?: string, "type": "bar"|"line", "labels": string[], "series": {"name": string, "data": number[]}[]}}
Each series data array must have the same length as labels. Use at least one chart when it helps. Keep narrative under 400 words.`;

      const user = `User question:\n${row.prompt}\n\nData (JSON):\n${contextJson}`;
      const raw = await callAnthropic(system, user, 4096);
      const cleaned = stripJsonFence(raw);
      let resultStructured: ReportStructured | null = null;
      let narrative = raw;
      try {
        const parsedJson = JSON.parse(cleaned) as unknown;
        const parsed = reportStructuredSchema.safeParse(parsedJson);
        if (parsed.success) {
          resultStructured = parsed.data;
          narrative = parsed.data.narrative;
        } else {
          narrative = `Model returned invalid JSON for chart mode. Raw (trimmed):\n\n${truncate(cleaned, 4000)}`;
        }
      } catch {
        narrative = `Could not parse JSON. Model said:\n\n${truncate(raw, 4000)}`;
      }

      await db
        .update(reportingRequests)
        .set({
          status: ReportingRequestStatus.done,
          resultMarkdown: narrative,
          resultStructured,
          updatedAt: new Date(),
        })
        .where(eq(reportingRequests.id, requestId));
    } else {
      const system = `You are an analytics assistant for a PM. You receive ONLY aggregated JSON about customer feedback. 
Answer the user's question clearly in markdown. Use only facts from the JSON — do not invent data. Be concise.`;

      const user = `User question:\n${row.prompt}\n\nData (JSON):\n${contextJson}`;
      const text = await callAnthropic(system, user, 2048);
      await db
        .update(reportingRequests)
        .set({
          status: ReportingRequestStatus.done,
          resultMarkdown: text,
          resultStructured: null,
          updatedAt: new Date(),
        })
        .where(eq(reportingRequests.id, requestId));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(reportingRequests)
      .set({
        status: ReportingRequestStatus.failed,
        errorMessage: msg,
        updatedAt: new Date(),
      })
      .where(eq(reportingRequests.id, requestId));
  }
}
