import Link from "next/link";
import type { ReactNode } from "react";
import { InterviewGuideSection } from "./InterviewGuideSection";
import { SurveySection } from "./SurveySection";
import { AssumptionMapContent, type AssumptionRow } from "@/components/discover/AssumptionMapContent";
import { CompetitorScanBlock } from "@/components/discover/CompetitorScanBlock";
import type { ActivityDetailRow } from "@customer-pulse/db/queries/discovery";
import {
  saveDiscoveryFindingsAction,
  markActivityCompleteAction,
  reopenActivityAction,
  draftActivityWithAIAction,
} from "@/app/app/discover/actions";

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

function AIContentBlock({
  activityType,
  content,
  insightId,
}: {
  activityType: number;
  content: Record<string, unknown>;
  insightId: number;
}) {
  switch (activityType) {
    case 2: {
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
      const raw = Array.isArray(content.assumptions) ? content.assumptions : [];
      const assumptions: AssumptionRow[] = raw.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          assumption: typeof r.assumption === "string" ? r.assumption : "",
          why_it_matters: typeof r.why_it_matters === "string" ? r.why_it_matters : "",
          how_to_test: typeof r.how_to_test === "string" ? r.how_to_test : "",
          risk_level: typeof r.risk_level === "string" ? r.risk_level : undefined,
        };
      });
      return <AssumptionMapContent assumptions={assumptions} />;
    }

    case 4: {
      const raw = Array.isArray(content.competitors) ? content.competitors : [];
      const competitors = raw.map((row) => {
        const o = row as Record<string, unknown>;
        return {
          name: typeof o.name === "string" ? o.name : "Unknown",
          things_to_check: Array.isArray(o.things_to_check) ? (o.things_to_check as string[]) : [],
          why_relevant: typeof o.why_relevant === "string" ? o.why_relevant : undefined,
        };
      });
      return <CompetitorScanBlock competitors={competitors} insightId={insightId} />;
    }

    case 5: {
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

export type DiscoveryActivityWorkspaceProps = {
  activity: ActivityDetailRow;
  insightTitle: string | null;
  /** When embedded on the insight workspace, mark-complete can send you back there with a note. */
  embedOnInsightWorkspace?: boolean;
  /** e.g. alert for assumption map empty findings */
  showEmptyFindingsNote?: boolean;
  /** Optional toolbar row above the two columns (link to full-page activity view). */
  toolbar?: ReactNode;
};

/**
 * Shared two-column discovery UI: AI draft (left) + findings (right).
 * Used on `/app/discover/activities/[id]` and on `/app/discover/workspace` when an insight is selected.
 */
export function DiscoveryActivityWorkspace({
  activity,
  insightTitle,
  embedOnInsightWorkspace = false,
  showEmptyFindingsNote = false,
  toolbar,
}: DiscoveryActivityWorkspaceProps) {
  const isComplete = activity.status === 3;
  const isDesk = activity.activityType === 6;
  const isInterviewGuide = activity.activityType === 1;
  const isSurvey = activity.activityType === 2;
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const isAssumptionMap = activity.activityType === 3;

  return (
    <div>
      {showEmptyFindingsNote ? (
        <div className="alert alert-info d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
          <p className="small mb-0">
            You marked this activity <strong>complete</strong> without writing anything in <strong>Your findings</strong>.
            That is OK — you can <strong>Reopen</strong> below anytime to record what you learned from testing these
            assumptions.
          </p>
          <a
            className="btn btn-sm btn-outline-info text-nowrap"
            href={
              embedOnInsightWorkspace
                ? `/app/discover/workspace?insight=${activity.insightId}`
                : `/app/discover/activities/${activity.id}`
            }
          >
            Dismiss
          </a>
        </div>
      ) : null}

      {toolbar ? <div className="mb-3">{toolbar}</div> : null}

      {/* Same placement as the old activity PageHeader actions — status + Reopen */}
      <div className="d-flex justify-content-end align-items-center mb-3">
        {isComplete ? (
          <form action={reopenActivityAction}>
            <input type="hidden" name="activity_id" value={activity.id} />
            <input type="hidden" name="insight_id" value={activity.insightId} />
            <button type="submit" className="btn btn-outline-secondary btn-sm">
              Reopen
            </button>
          </form>
        ) : (
          <span className="badge text-bg-warning">In progress</span>
        )}
      </div>

      <div className="row g-4">
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
                {!isDesk && !isInterviewGuide && (!isSurvey || activity.aiGenerated) ? (
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
                <div>
                  <p className="small text-body-secondary mb-2">
                    Use this space to record findings from secondary research — articles, studies,
                    internal documents, or anything else relevant to the insight.
                  </p>
                  <p className="small text-body-secondary mb-0">
                    Write your notes in the findings section on the right.
                  </p>
                </div>
              ) : isInterviewGuide ? (
                <InterviewGuideSection
                  aiGeneratedContent={activity.aiGeneratedContent}
                  activityId={activity.id}
                  insightId={activity.insightId}
                  isComplete={isComplete}
                  hasAnthropicKey={hasAnthropicKey}
                />
              ) : isSurvey ? (
                <SurveySection
                  aiGeneratedContent={activity.aiGeneratedContent}
                  activityId={activity.id}
                  insightId={activity.insightId}
                  isComplete={isComplete}
                  hasAnthropicKey={hasAnthropicKey}
                />
              ) : activity.aiGeneratedContent ? (
                <AIContentBlock
                  activityType={activity.activityType}
                  content={activity.aiGeneratedContent}
                  insightId={activity.insightId}
                />
              ) : (
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

        <div className="col-lg-6">
          <div className="card border-secondary-subtle h-100">
            <div className="card-header bg-transparent py-3">
              <span className="small fw-semibold text-body-emphasis">Your findings</span>
              <p className="small text-body-secondary mb-0 mt-1">
                {isAssumptionMap ? (
                  <>
                    Record what you learned from <strong>testing each assumption</strong> — e.g. what you tried, what
                    surprised you, and which assumptions you now believe or reject. Use the list on the left as your
                    checklist.
                  </>
                ) : (
                  <>
                    Record what you learned from completing this activity. Use the AI content on the left as a starting
                    point.
                  </>
                )}
              </p>
            </div>

            <div className="card-body d-flex flex-column py-3">
              {isComplete ? (
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
                <form action={saveDiscoveryFindingsAction} className="d-flex flex-column flex-grow-1 gap-3">
                  <input type="hidden" name="activity_id" value={activity.id} />
                  <input type="hidden" name="insight_id" value={activity.insightId} />
                  {embedOnInsightWorkspace ? <input type="hidden" name="return_to" value="discover" /> : null}
                  <textarea
                    name="findings"
                    className="form-control flex-grow-1"
                    rows={12}
                    placeholder={
                      isAssumptionMap
                        ? "e.g. Assumption: [quote] — we ran [test] and saw [result], so we now think…"
                        : "Write your findings here… (supports markdown)"
                    }
                    defaultValue={activity.findings ?? ""}
                  />
                  <div className="d-flex gap-2 justify-content-between flex-wrap align-items-center">
                    <button type="submit" formAction={saveDiscoveryFindingsAction} className="btn btn-outline-secondary btn-sm">
                      Save findings
                    </button>
                    <button type="submit" formAction={markActivityCompleteAction} className="btn btn-success btn-sm">
                      Mark complete
                    </button>
                  </div>
                </form>
              )}
            </div>

            {!isComplete ? (
              <div
                className="card-footer bg-transparent py-2"
                style={{ borderTop: "1px solid var(--bs-border-color)" }}
              >
                <p className="small text-body-secondary mb-0">
                  {isAssumptionMap
                    ? "Mark complete when you are ready to move on. You can leave findings blank for now, but adding notes helps your future self in Build."
                    : "Mark complete once you have saved your main takeaways. \"Mark complete\" also saves the text in the box above."}
                </p>
              </div>
            ) : null}

            {isComplete ? (
              <div className="card-footer bg-transparent py-2 d-flex align-items-center gap-2">
                <span className="badge text-bg-success">Complete</span>
                <p className="small text-body-secondary mb-0">
                  Findings locked. Click <strong>Reopen</strong> to edit.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
