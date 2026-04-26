import Link from "next/link";
import { DiscoveryActivityWorkspace } from "@/components/discovery/DiscoveryActivityWorkspace";
import { getRequestDb } from "@/lib/db";
import {
  getActivitiesByInsight,
  getActivityById,
} from "@customer-pulse/db/queries/discovery";
import { createDiscoveryActivityAction } from "./actions";

const DISCOVER_HOME_TOOLS = [
  {
    type: 1,
    title: "Interview Guide Generator",
    shortAction: "interview guide",
    description:
      "Claude drafts open-ended interview questions from the insight. Copy them into your scheduling tool, then record your findings on the right.",
  },
  {
    type: 2,
    title: "Survey Builder",
    shortAction: "survey",
    description:
      "Claude drafts a short five-question survey. Edit, export, and send it — then capture what you heard in findings.",
  },
  {
    type: 3,
    title: "Assumption Mapper",
    shortAction: "assumption map",
    description:
      "Surfaces hidden assumptions and how to test them. Use the checklist while you validate, then write what you learned.",
  },
  {
    type: 4,
    title: "Competitor Scan",
    shortAction: "competitor scan",
    description:
      "Suggests who to research and what to look for. Check off tasks as you go, export Markdown, and summarize conclusions in findings.",
  },
] as const;

type Props = {
  insightId: number;
  projectId: number;
  insightTitle: string;
};

/**
 * Renders the four expandable tool panels for Discover home (server component).
 */
export async function DiscoverHomeToolSections({ insightId, projectId, insightTitle }: Props) {
  const db = await getRequestDb();
  const activities = await getActivitiesByInsight(db, insightId, projectId);

  const toolPanels = await Promise.all(
    DISCOVER_HOME_TOOLS.map(async (tool) => {
      const ofType = activities
        .filter((a) => a.activityType === tool.type)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      const latest = ofType[0];
      const detail = latest ? await getActivityById(db, latest.id, projectId) : null;
      return { tool, detail, count: ofType.length };
    }),
  );

  return (
    <div className="d-flex flex-column gap-3">
      {toolPanels.map(({ tool, detail, count }, index) => (
        <details key={tool.type} className="card border-secondary-subtle shadow-sm" open={index === 0}>
          <summary
            className="card-header bg-body-secondary py-3 d-flex align-items-center justify-content-between gap-2"
            style={{ cursor: "pointer", listStyle: "none" }}
          >
            <span className="fw-semibold text-body-emphasis">{tool.title}</span>
            <span className="badge rounded-pill text-bg-success" style={{ fontSize: "0.65rem" }}>
              On this page
            </span>
          </summary>
          <div className="card-body border-top border-secondary-subtle">
            <p className="small text-body-secondary mb-3">{tool.description}</p>

            {!detail ? (
              <form action={createDiscoveryActivityAction}>
                <input type="hidden" name="insight_id" value={insightId} />
                <input type="hidden" name="activity_type" value={tool.type} />
                <input type="hidden" name="return_to" value="discover" />
                <button type="submit" className="btn btn-primary btn-sm">
                  Start {tool.shortAction}
                </button>
              </form>
            ) : (
              <>
                <div className="mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <p className="small text-body-secondary mb-0">
                    <span className="fw-medium text-body">{detail.title}</span>
                    {count > 1 ? (
                      <span className="text-body-tertiary"> · {count} of this type for this insight</span>
                    ) : null}
                  </p>
                  <Link href={`/app/discover/activities/${detail.id}`} className="btn btn-outline-secondary btn-sm">
                    Full-page view
                  </Link>
                </div>
                <DiscoveryActivityWorkspace
                  activity={detail}
                  insightTitle={insightTitle}
                  embedOnDiscoverHome
                />
              </>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
