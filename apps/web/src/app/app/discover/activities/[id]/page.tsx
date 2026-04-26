import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PageHeader, PageShell } from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { getActivityById } from "@customer-pulse/db/queries/discovery";
import {
  saveDiscoveryFindingsAction,
  markActivityCompleteAction,
  reopenActivityAction,
  draftActivityWithAIAction,
} from "../../actions";

/**
 * Returns the human-readable label for an activity type integer.
 */
function activityTypeLabel(type: number): string {
  const labels: Record<number, string> = {
    1: "Interview guide",
    2: "Survey",
    3: "Assumption map",
    4: "Competitor scan",
    5: "Data query",
    6: "Desk research",
    7: "Prototype hypothesis",
  };
  return labels[type] ?? "Discovery activity";
}

/**
 * Renders the AI-generated content block for each activity type.
 * The structure of aiGeneratedContent differs per type, so we format it here.
 */
function AIContentBlock({
  activityType,
  content,
}: {
  activityType: number;
  content: Record<string, unknown>;
}) {
  switch (activityType) {
    case 1: {
      // Interview guide: { questions: string[] }
      const questions = Array.isArray(content.questions) ? (content.questions as string[]) : [];
      return (
        <div>
          <p className="small fw-medium text-body-secondary mb-2">Interview questions</p>
          <ol className="ps-4 mb-0">
            {questions.map((q, i) => (
              <li key={i} className="small mb-2" style={{ lineHeight: 1.6 }}>
                {q}
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case 2: {
      // Survey: { questions: { question: string; type: string; options?: string[] }[] }
      const questions = Array.isArray(content.questions)
        ? (content.questions as { question: string; type: string; options?: string[] }[])
        : [];
      return (
        <div>
          <p className="small fw-medium text-body-secondary mb-2">Survey questions</p>
          <ol className="ps-4 mb-0">
            {questions.map((q, i) => (
              <li key={i} className="small mb-3">
                <p className="mb-1" style={{ lineHeight: 1.6 }}>
                  {q.question}
                </p>
                <span className="badge bg-body-secondary text-body-secondary border border-secondary-subtle" style={{ fontSize: "0.65rem" }}>
                  {q.type}
                </span>
                {q.options && q.options.length > 0 ? (
                  <ul className="mt-1 mb-0 ps-3">
                    {q.options.map((opt, j) => (
                      <li key={j} className="small text-body-secondary">
                        {opt}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case 3: {
      // Assumption map: { assumptions: { assumption: string; why_it_matters: string; how_to_test: string }[] }
      const assumptions = Array.isArray(content.assumptions)
        ? (content.assumptions as { assumption: string; why_it_matters: string; how_to_test: string }[])
        : [];
      return (
        <div>
          <p className="small fw-medium text-body-secondary mb-2">Assumptions to test</p>
          <div className="d-flex flex-column gap-3">
            {assumptions.map((a, i) => (
              <div key={i} className="p-2 rounded" style={{ background: "var(--bs-body-bg)", border: "1px solid var(--bs-border-color)" }}>
                <p className="small fw-medium mb-1">{a.assumption}</p>
                <p className="small text-body-secondary mb-1">
                  <span className="fw-medium">Why it matters:</span> {a.why_it_matters}
                </p>
                <p className="small text-body-secondary mb-0">
                  <span className="fw-medium">How to test:</span> {a.how_to_test}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 4: {
      // Competitor scan: { competitors: { name: string; things_to_check: string[] }[] }
      const competitors = Array.isArray(content.competitors)
        ? (content.competitors as { name: string; things_to_check: string[] }[])
        : [];
      return (
        <div>
          <p className="small fw-medium text-body-secondary mb-2">Competitors to research</p>
          <div className="d-flex flex-column gap-3">
            {competitors.map((c, i) => (
              <div key={i}>
                <p className="small fw-medium mb-1">{c.name}</p>
                <ul className="ps-3 mb-0">
                  {c.things_to_check.map((t, j) => (
                    <li key={j} className="small text-body-secondary">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 5: {
      // Data query: { queries: { question: string; what_it_would_show: string }[] }
      const queries = Array.isArray(content.queries)
        ? (content.queries as { question: string; what_it_would_show: string }[])
        : [];
      return (
        <div>
          <p className="small fw-medium text-body-secondary mb-2">Suggested data queries</p>
          <div className="d-flex flex-column gap-3">
            {queries.map((q, i) => (
              <div key={i}>
                <p className="small fw-medium mb-1">{q.question}</p>
                <p className="small text-body-secondary mb-0">
                  <span className="fw-medium">What it shows:</span> {q.what_it_would_show}
                </p>
              </div>
            ))}
          </div>
          <p className="small text-body-secondary mt-3 mb-0">
            <Link href="/app/reporting" className="link-secondary">
              Open Reporting →
            </Link>{" "}
            to run these queries against your feedback data.
          </p>
        </div>
      );
    }

    case 7: {
      // Prototype hypothesis: { hypothesis: string; test_ideas: string[] }
      const hypothesis = typeof content.hypothesis === "string" ? content.hypothesis : "";
      const testIdeas = Array.isArray(content.test_ideas) ? (content.test_ideas as string[]) : [];
      return (
        <div>
          <p className="small fw-medium text-body-secondary mb-2">Hypothesis</p>
          <p
            className="small p-3 rounded mb-3"
            style={{
              background: "rgba(var(--bs-primary-rgb), 0.06)",
              border: "1px solid rgba(var(--bs-primary-rgb), 0.12)",
              fontStyle: "italic",
            }}
          >
            {hypothesis}
          </p>
          <p className="small fw-medium text-body-secondary mb-2">Ways to test it</p>
          <ul className="ps-3 mb-0">
            {testIdeas.map((idea, i) => (
              <li key={i} className="small mb-1">
                {idea}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    default:
      return (
        <pre className="small text-body-secondary" style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(content, null, 2)}
        </pre>
      );
  }
}

/**
 * Activity detail page — the main working view for a single discovery activity.
 *
 * Layout:
 *   Left panel  — AI-drafted content (questions, assumptions, hypothesis, etc.)
 *   Right panel — PM findings textarea + status actions
 */
export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const activityId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(activityId)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/discover");
  }

  const db = await getRequestDb();
  const activity = await getActivityById(db, activityId, projectId);

  if (!activity) {
    notFound();
  }

  // Load the parent insight for context
  const [insight] = await db
    .select({ id: insights.id, title: insights.title })
    .from(insights)
    .where(and(eq(insights.id, activity.insightId), eq(insights.projectId, projectId)))
    .limit(1);

  const isComplete = activity.status === 3;
  const isDesk = activity.activityType === 6; // desk_research has no AI draft

  return (
    <PageShell width="full">
      <PageHeader
        title={activity.title}
        description={
          <>
            {activityTypeLabel(activity.activityType)}
            {insight ? (
              <>
                {" · "}
                <Link
                  href={`/app/discover/insights/${insight.id}`}
                  className="text-body-secondary text-decoration-none"
                >
                  {insight.title}
                </Link>
              </>
            ) : null}
          </>
        }
        back={{
          href: insight ? `/app/discover/insights/${insight.id}` : "/app/discover/insights",
          label: insight ? "Back to insight" : "Discovery",
        }}
        actions={
          isComplete ? (
            <form action={reopenActivityAction}>
              <input type="hidden" name="activity_id" value={activity.id} />
              <input type="hidden" name="insight_id" value={activity.insightId} />
              <button type="submit" className="btn btn-outline-secondary btn-sm">
                Reopen
              </button>
            </form>
          ) : (
            <span className="badge text-bg-warning">In progress</span>
          )
        }
      />

      <div className="row g-4">
        {/* ── Left: AI-drafted content ─────────────────────────────────────── */}
        <div className="col-lg-6">
          <div className="card border-secondary-subtle h-100">
            <div className="card-header bg-transparent d-flex align-items-center justify-content-between py-3">
              <span className="small fw-semibold text-body-emphasis">
                {isDesk ? "Research notes prompt" : "AI drafted content"}
              </span>
              <div className="d-flex align-items-center gap-2">
                {activity.aiGenerated ? (
                  <span
                    className="badge border"
                    style={{
                      fontSize: "0.65rem",
                      background: "rgba(var(--bs-primary-rgb), 0.08)",
                      color: "var(--bs-primary)",
                      borderColor: "rgba(var(--bs-primary-rgb), 0.2)",
                    }}
                  >
                    AI drafted
                  </span>
                ) : null}
                {/* "Draft with AI" button — hidden for desk research */}
                {!isDesk ? (
                  <form action={draftActivityWithAIAction}>
                    <input type="hidden" name="activity_id" value={activity.id} />
                    <input type="hidden" name="insight_id" value={activity.insightId} />
                    <button type="submit" className="btn btn-sm btn-outline-primary">
                      {activity.aiGenerated ? "Regenerate" : "Draft with AI"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="card-body py-3">
              {isDesk ? (
                /* Desk research prompt */
                <div>
                  <p className="small text-body-secondary mb-2">
                    Use this space to record findings from secondary research — articles, studies,
                    internal documents, or anything else relevant to the insight.
                  </p>
                  <p className="small text-body-secondary mb-0">
                    Write your notes in the findings section on the right.
                  </p>
                </div>
              ) : activity.aiGeneratedContent ? (
                <AIContentBlock
                  activityType={activity.activityType}
                  content={activity.aiGeneratedContent}
                />
              ) : (
                /* No AI content yet — prompt to draft */
                <div className="text-center py-4">
                  <p className="small text-body-secondary mb-3">
                    No AI content yet. Click <strong>Draft with AI</strong> to have Claude generate{" "}
                    {activityTypeLabel(activity.activityType).toLowerCase()} content based on the
                    insight.
                  </p>
                  <form action={draftActivityWithAIAction}>
                    <input type="hidden" name="activity_id" value={activity.id} />
                    <input type="hidden" name="insight_id" value={activity.insightId} />
                    <button type="submit" className="btn btn-primary btn-sm">
                      Draft with AI
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Findings editor ───────────────────────────────────────── */}
        <div className="col-lg-6">
          <div className="card border-secondary-subtle h-100">
            <div className="card-header bg-transparent py-3">
              <span className="small fw-semibold text-body-emphasis">Your findings</span>
              <p className="small text-body-secondary mb-0 mt-1">
                Record what you learned from completing this activity. Use the AI content on the
                left as a starting point.
              </p>
            </div>

            <div className="card-body d-flex flex-column py-3">
              {isComplete ? (
                /* Read-only view when complete */
                <div
                  className="flex-grow-1 p-2 rounded small text-body"
                  style={{
                    background: "var(--bs-body-bg)",
                    border: "1px solid var(--bs-border-color)",
                    whiteSpace: "pre-wrap",
                    minHeight: "200px",
                  }}
                >
                  {activity.findings ?? (
                    <span className="text-body-tertiary">No findings recorded.</span>
                  )}
                </div>
              ) : (
                /* Editable form when not yet complete */
                <form action={saveDiscoveryFindingsAction} className="d-flex flex-column flex-grow-1 gap-3">
                  <input type="hidden" name="activity_id" value={activity.id} />
                  <input type="hidden" name="insight_id" value={activity.insightId} />
                  <textarea
                    name="findings"
                    className="form-control flex-grow-1"
                    rows={12}
                    placeholder="Write your findings here… (supports markdown)"
                    defaultValue={activity.findings ?? ""}
                  />
                  <div className="d-flex gap-2 justify-content-between flex-wrap">
                    <button type="submit" className="btn btn-outline-secondary btn-sm">
                      Save findings
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Mark complete footer — only shown when not already complete */}
            {!isComplete ? (
              <div
                className="card-footer bg-transparent py-3 d-flex align-items-center gap-3"
                style={{ borderTop: "1px solid var(--bs-border-color)" }}
              >
                <form action={markActivityCompleteAction} className="d-flex gap-2">
                  <input type="hidden" name="activity_id" value={activity.id} />
                  <input type="hidden" name="insight_id" value={activity.insightId} />
                  <button type="submit" className="btn btn-success btn-sm">
                    Mark complete
                  </button>
                </form>
                <p className="small text-body-secondary mb-0">
                  Mark complete once you&apos;ve recorded your findings.
                </p>
              </div>
            ) : (
              <div className="card-footer bg-transparent py-2 d-flex align-items-center gap-2">
                <span className="badge text-bg-success">Complete</span>
                <p className="small text-body-secondary mb-0">
                  Findings locked. Click <strong>Reopen</strong> to edit.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
