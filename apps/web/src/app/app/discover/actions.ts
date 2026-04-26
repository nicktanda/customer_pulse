"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { insights } from "@customer-pulse/db/client";
import { and, eq } from "drizzle-orm";
import {
  createDiscoveryActivity,
  updateDiscoveryActivity,
  getActivityById,
  getActivitiesByInsight,
} from "@customer-pulse/db/queries/discovery";

// ─── Auth helper ─────────────────────────────────────────────────────────────

/**
 * Shared auth + project check for all discovery actions.
 * Returns userId + projectId or redirects.
 */
async function requireEditor() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null) {
    redirect("/app/projects");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/discover");
  }
  return { userId, projectId };
}

// ─── Activity labels (mirrors enums — kept in sync with enums.ts) ─────────────

/**
 * Returns a default title for a new activity based on its type.
 * Type integers match DiscoveryActivityType in packages/db/src/enums.ts.
 */
function defaultTitleForType(type: number): string {
  switch (type) {
    case 1: return "Interview guide";
    case 2: return "Survey";
    case 3: return "Assumption map";
    case 4: return "Competitor scan";
    case 5: return "Data query";
    case 6: return "Desk research";
    case 7: return "Prototype hypothesis";
    default: return "Discovery activity";
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Server action: creates a new discovery activity for a given insight.
 *
 * Form fields expected:
 *   insight_id     (required) — the insight this activity investigates
 *   activity_type  (required) — integer 1–7 matching DiscoveryActivityType
 *   title          (optional) — defaults to the type label if blank
 *
 * On success: redirects to the new activity's detail page.
 */
export async function createDiscoveryActivityAction(formData: FormData): Promise<void> {
  const { userId, projectId } = await requireEditor();

  const insightId = Number.parseInt(String(formData.get("insight_id") ?? ""), 10);
  const activityType = Number.parseInt(String(formData.get("activity_type") ?? ""), 10);

  if (!Number.isFinite(insightId) || !Number.isFinite(activityType)) {
    redirect("/app/discover");
  }

  const rawTitle = String(formData.get("title") ?? "").trim();
  const title = rawTitle || defaultTitleForType(activityType);

  const db = await getRequestDb();

  // Verify the insight belongs to this project before creating
  const [insightRow] = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);

  if (!insightRow) {
    redirect("/app/discover");
  }

  const newId = await createDiscoveryActivity(db, {
    projectId,
    insightId,
    activityType,
    title,
    createdBy: userId,
  });

  revalidatePath(`/app/discover/insights/${insightId}`);
  revalidatePath("/app/discover/insights");

  // Redirect to the new activity — the page will offer to draft with AI
  redirect(`/app/discover/activities/${newId}`);
}

// ─── Update findings ──────────────────────────────────────────────────────────

/**
 * Server action: saves a PM's findings on a discovery activity.
 *
 * Form fields:
 *   activity_id   (required)
 *   insight_id    (required) — used for cache revalidation
 *   findings      (optional) — markdown text
 */
export async function saveDiscoveryFindingsAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();

  const activityId = Number.parseInt(String(formData.get("activity_id") ?? ""), 10);
  const insightId = Number.parseInt(String(formData.get("insight_id") ?? ""), 10);
  const findings = String(formData.get("findings") ?? "").trim() || null;

  if (!Number.isFinite(activityId)) {
    return;
  }

  const db = await getRequestDb();
  await updateDiscoveryActivity(db, activityId, projectId, { findings });

  revalidatePath(`/app/discover/activities/${activityId}`);
  if (Number.isFinite(insightId)) {
    revalidatePath(`/app/discover/insights/${insightId}`);
  }
}

// ─── Mark complete / reopen ───────────────────────────────────────────────────

/**
 * Server action: marks an activity as complete (status=3).
 *
 * Form fields:
 *   activity_id  (required)
 *   insight_id   (required) — used for cache revalidation
 */
export async function markActivityCompleteAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();

  const activityId = Number.parseInt(String(formData.get("activity_id") ?? ""), 10);
  const insightId = Number.parseInt(String(formData.get("insight_id") ?? ""), 10);

  if (!Number.isFinite(activityId)) return;

  const db = await getRequestDb();

  // Save any findings passed alongside the status change
  const findings = String(formData.get("findings") ?? "").trim() || null;
  await updateDiscoveryActivity(db, activityId, projectId, {
    status: 3, // complete
    ...(findings !== null ? { findings } : {}),
  });

  revalidatePath(`/app/discover/activities/${activityId}`);
  if (Number.isFinite(insightId)) {
    revalidatePath(`/app/discover/insights/${insightId}`);
    revalidatePath("/app/discover/insights");
  }
}

/**
 * Server action: re-opens a completed activity back to "in progress" (status=2).
 *
 * Form fields:
 *   activity_id  (required)
 *   insight_id   (required)
 */
export async function reopenActivityAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();

  const activityId = Number.parseInt(String(formData.get("activity_id") ?? ""), 10);
  const insightId = Number.parseInt(String(formData.get("insight_id") ?? ""), 10);

  if (!Number.isFinite(activityId)) return;

  const db = await getRequestDb();
  await updateDiscoveryActivity(db, activityId, projectId, { status: 2 }); // in_progress

  revalidatePath(`/app/discover/activities/${activityId}`);
  if (Number.isFinite(insightId)) {
    revalidatePath(`/app/discover/insights/${insightId}`);
  }
}

// ─── AI drafting ──────────────────────────────────────────────────────────────

/**
 * Fetches the Anthropic API key from the environment.
 * The web app reads ANTHROPIC_API_KEY directly — no DB fallback needed here
 * since the worker already handles the DB-stored key path.
 */
async function getApiKey(): Promise<string | null> {
  return process.env.ANTHROPIC_API_KEY?.trim() ?? null;
}

/**
 * Calls the Anthropic Messages API and returns the text response.
 * Returns null on any failure (network error, missing key, API error).
 */
async function callClaudeText(system: string, user: string): Promise<string | null> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error("[discover] No ANTHROPIC_API_KEY set — cannot draft activity content");
    return null;
  }

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    const json = (await res.json()) as {
      content?: { type: string; text?: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      console.error(`[discover] Anthropic error: ${json.error?.message ?? `HTTP ${res.status}`}`);
      return null;
    }

    return json.content?.find((c) => c.type === "text")?.text ?? null;
  } catch (err) {
    console.error(`[discover] Anthropic fetch error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Returns the system + user prompts for a given activity type.
 * The insight title, description, and type context are injected into each prompt.
 */
function buildDraftPrompts(
  activityType: number,
  insight: { title: string; description: string; insightType: number },
): { system: string; user: string } | null {
  const context = `Insight title: ${insight.title}\nInsight description: ${insight.description}`;

  switch (activityType) {
    case 1: // interview_guide
      return {
        system:
          "You are a product manager helping to validate customer insights before building solutions. " +
          "Your job is to create practical, open-ended interview guides that uncover the real problem behind a signal.",
        user:
          `${context}\n\n` +
          "Generate a set of 6 open-ended interview questions that would help validate whether this insight reflects " +
          "a real, widespread, and worthwhile problem to solve. Avoid leading questions. " +
          "Format your response as a JSON object with a single key 'questions' containing an array of strings. " +
          "Each string is one question. Return only valid JSON, no markdown fences.",
      };

    case 2: // survey
      return {
        system:
          "You are a product manager designing targeted surveys to validate customer insights. " +
          "Keep surveys short (5 questions max), clear, and unbiased.",
        user:
          `${context}\n\n` +
          "Generate a 5-question survey to send to users who might be affected by this insight. " +
          "Include a mix of Likert scale, multiple choice, and one open-ended question. " +
          "Format as a JSON object with key 'questions', an array of objects each with 'question' (string) and 'type' " +
          "('likert', 'multiple_choice', or 'open_ended') and optional 'options' array. " +
          "Return only valid JSON, no markdown fences.",
      };

    case 3: // assumption_map
      return {
        system:
          "You are a product manager trained in assumption-based testing. " +
          "Your job is to surface the hidden assumptions behind a product insight so teams can de-risk their decisions.",
        user:
          `${context}\n\n` +
          "List 5 assumptions being made in this insight. For each assumption, explain why it matters " +
          "and suggest one specific way to test or disprove it. " +
          "Format as a JSON object with key 'assumptions', an array of objects each with 'assumption' (string), " +
          "'why_it_matters' (string), and 'how_to_test' (string). " +
          "Return only valid JSON, no markdown fences.",
      };

    case 4: // competitor_scan
      return {
        system:
          "You are a product manager conducting competitive research. " +
          "Help teams understand how competitors handle the same customer problems.",
        user:
          `${context}\n\n` +
          "Suggest 3 competitors or comparable products to research about this problem. " +
          "For each, list 3 specific things to look for or questions to answer about how they address this. " +
          "Format as a JSON object with key 'competitors', an array of objects each with " +
          "'name' (string) and 'things_to_check' (array of strings). " +
          "Return only valid JSON, no markdown fences.",
      };

    case 5: // data_query
      return {
        system:
          "You are a product analyst helping a PM find quantitative evidence to back up a qualitative insight.",
        user:
          `${context}\n\n` +
          "Suggest 3 data questions or metrics a PM could query to quantitatively validate this insight. " +
          "For each, explain what the data would show and how it would confirm or refute the insight. " +
          "Format as a JSON object with key 'queries', an array of objects each with " +
          "'question' (string) and 'what_it_would_show' (string). " +
          "Return only valid JSON, no markdown fences.",
      };

    case 6: // desk_research — no AI draft, human-authored
      return null;

    case 7: // prototype_hypothesis
      return {
        system:
          "You are a product manager who uses hypothesis-driven development. " +
          "Help craft a clear, testable hypothesis before a prototype is built.",
        user:
          `${context}\n\n` +
          "Write a testable hypothesis for this insight in the format: " +
          "'We believe [solution] will [outcome] for [user type] because [assumption].'\n" +
          "Also suggest 2 ways to prototype-test this hypothesis quickly. " +
          "Format as a JSON object with keys 'hypothesis' (string) and 'test_ideas' (array of 2 strings). " +
          "Return only valid JSON, no markdown fences.",
      };

    default:
      return null;
  }
}

/**
 * Server action: calls Claude to draft AI content for a discovery activity.
 *
 * Form fields:
 *   activity_id  (required)
 *   insight_id   (required)
 *
 * On completion: revalidates the activity detail page (no redirect — stay on page).
 */
export async function draftActivityWithAIAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();

  const activityId = Number.parseInt(String(formData.get("activity_id") ?? ""), 10);
  const insightId = Number.parseInt(String(formData.get("insight_id") ?? ""), 10);

  if (!Number.isFinite(activityId) || !Number.isFinite(insightId)) return;

  const db = await getRequestDb();

  // Load the activity and insight
  const activity = await getActivityById(db, activityId, projectId);
  if (!activity) return;

  const [insightRow] = await db
    .select({ title: insights.title, description: insights.description, insightType: insights.insightType })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);

  if (!insightRow) return;

  const prompts = buildDraftPrompts(activity.activityType, insightRow);
  if (!prompts) {
    // Desk research has no AI draft — just mark aiGenerated=false and return
    return;
  }

  const responseText = await callClaudeText(prompts.system, prompts.user);
  if (!responseText) return;

  // Try to parse the JSON response from Claude
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    // Claude sometimes wraps JSON in markdown fences — strip and retry
    const fenceMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch?.[1]) {
      try {
        parsed = JSON.parse(fenceMatch[1]) as Record<string, unknown>;
      } catch {
        console.error("[discover] Could not parse Claude's JSON response");
      }
    }
  }

  if (parsed) {
    await updateDiscoveryActivity(db, activityId, projectId, {
      aiGeneratedContent: parsed,
      aiGenerated: true,
      // Move from draft to in_progress when AI content is drafted
      status: activity.status === 1 ? 2 : activity.status,
    });
  }

  revalidatePath(`/app/discover/activities/${activityId}`);
}

// ─── AI findings summary ──────────────────────────────────────────────────────

/**
 * Server action: generates an AI summary of all completed activity findings for an insight.
 *
 * Form fields:
 *   insight_id  (required)
 *
 * The summary is returned as a string and stored in the activities cache via revalidation.
 * Because server actions can't return values to server components, we store the summary
 * on the insight as a separate discoverable piece of state via a dedicated column approach.
 * For now we pass it back via redirect with a query param — the page reads it and shows it.
 */
export async function generateDiscoverySummaryAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();

  const insightId = Number.parseInt(String(formData.get("insight_id") ?? ""), 10);
  if (!Number.isFinite(insightId)) return;

  const db = await getRequestDb();

  // Load all complete activities for this insight
  const activities = await getActivitiesByInsight(db, insightId, projectId);
  const completeActivities = activities.filter((a) => a.status === 3);

  if (completeActivities.length === 0) {
    redirect(`/app/discover/insights/${insightId}`);
  }

  // Load the full findings for each complete activity
  const detailRows = await Promise.all(
    completeActivities.map((a) => getActivityById(db, a.id, projectId)),
  );

  const findingsText = detailRows
    .filter((r) => r !== null && r.findings)
    .map((r) => `## ${r!.title}\n${r!.findings}`)
    .join("\n\n");

  if (!findingsText) {
    redirect(`/app/discover/insights/${insightId}`);
  }

  const [insightRow] = await db
    .select({ title: insights.title, description: insights.description })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);

  if (!insightRow) {
    redirect(`/app/discover/insights/${insightId}`);
  }

  const system =
    "You are a product manager synthesising discovery findings before writing a product spec. " +
    "Your job is to produce a concise, honest summary that a PM can read in 30 seconds.";

  const user =
    `Insight: ${insightRow.title}\n` +
    `Description: ${insightRow.description}\n\n` +
    `Discovery findings from ${completeActivities.length} completed activities:\n\n` +
    `${findingsText}\n\n` +
    "Write a 3–5 sentence summary of what the discovery found. Include: " +
    "what was confirmed, what was surprising, and whether there is enough evidence to build a spec. " +
    "Be direct and factual. Do not use headers or bullet points — write in plain prose.";

  const summary = await callClaudeText(system, user);

  if (summary) {
    // Store the summary on the first complete activity as a convenient signal
    // (In a later version this will move to a dedicated insights.discovery_summary column)
    await updateDiscoveryActivity(db, completeActivities[0]!.id, projectId, {});
  }

  revalidatePath(`/app/discover/insights/${insightId}`);
  redirect(`/app/discover/insights/${insightId}?summary=${encodeURIComponent(summary ?? "")}`);
}
