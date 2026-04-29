import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbacks, ideas, insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { callClaudeStreamWeb } from "@/lib/claude";

export const runtime = "nodejs";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(4000),
      }),
    )
    .max(8)
    .optional(),
});

/**
 * Cross-cut B: chat over the project's discovery corpus (insights + ideas + recent feedback).
 *
 * RAG via plain Postgres ILIKE token overlap — no pgvector dep yet. Streams the response back
 * as SSE so the UI can render tokens incrementally. Stateless per turn: passes the last 6
 * messages plus a freshly-retrieved corpus on every request.
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

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const tokens = parsed.question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);

  const db = await getRequestDb();

  // Naive retrieval: pull most-recent ~30 of each, score by token overlap, keep top 8 of each.
  const [insightRows, ideaRows, feedbackRows] = await Promise.all([
    db
      .select({ id: insights.id, title: insights.title, description: insights.description })
      .from(insights)
      .where(eq(insights.projectId, projectId))
      .orderBy(desc(insights.updatedAt))
      .limit(30),
    db
      .select({ id: ideas.id, title: ideas.title, description: ideas.description })
      .from(ideas)
      .where(eq(ideas.projectId, projectId))
      .orderBy(desc(ideas.updatedAt))
      .limit(30),
    db
      .select({ id: feedbacks.id, title: feedbacks.title, content: feedbacks.content })
      .from(feedbacks)
      .where(eq(feedbacks.projectId, projectId))
      .orderBy(desc(feedbacks.createdAt))
      .limit(30),
  ]);

  function score(text: string): number {
    const hay = text.toLowerCase();
    return tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
  }

  const topInsights = insightRows
    .map((r) => ({ ...r, s: score(`${r.title} ${r.description}`) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8);
  const topIdeas = ideaRows
    .map((r) => ({ ...r, s: score(`${r.title} ${r.description}`) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8);
  const topFeedback = feedbackRows
    .map((r) => ({ ...r, s: score(`${r.title ?? ""} ${r.content}`) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8);

  const corpus = [
    "Insights:",
    ...topInsights.map((r) => `[insight ${r.id}] ${r.title}: ${r.description.slice(0, 300)}`),
    "",
    "Ideas:",
    ...topIdeas.map((r) => `[idea ${r.id}] ${r.title}: ${r.description.slice(0, 300)}`),
    "",
    "Recent feedback:",
    ...topFeedback.map((r) => `[feedback ${r.id}] ${r.title ?? "(no title)"}: ${r.content.slice(0, 300)}`),
  ].join("\n");

  const history = parsed.history ?? [];
  const transcript = history.map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`).join("\n\n");

  const system = `You are a discovery research assistant for a customer-feedback PM tool. Answer the user's question using ONLY the provided corpus. Cite sources inline like [insight 12] or [feedback 304] when relevant. If the corpus doesn't contain the answer, say so plainly.`;

  const user = `Corpus:\n${corpus}\n\n${transcript ? `Conversation so far:\n${transcript}\n\n` : ""}User: ${parsed.question}`;

  const stream = await callClaudeStreamWeb({ system, user, maxTokens: 1200 });
  if (!stream) {
    return NextResponse.json({ error: "AI unavailable — check Anthropic key." }, { status: 503 });
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
