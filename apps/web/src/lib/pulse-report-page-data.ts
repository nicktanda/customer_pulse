import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import {
  feedbacks,
  ideas,
  insights,
  ideaPullRequests,
  pulseReports,
} from "@customer-pulse/db/client";

const IDEA_QUICK_WIN = 0;
const IMPACT_HIGH = 3;
const IMPACT_TRANS = 4;
const EFFORT_TRIVIAL = 0;
const EFFORT_SMALL = 1;

export type PulseReportPageData = {
  row: typeof pulseReports.$inferSelect;
  periodFeedbacks: { id: number; title: string | null; createdAt: Date }[];
  insightRows: { id: number; title: string; description: string }[];
  quickWins: (typeof ideas.$inferSelect)[];
  highImpact: (typeof ideas.$inferSelect)[];
  prByIdea: Map<number, { status: number; progressMessage: string | null }[]>;
  hasPendingPrs: boolean;
};

/**
 * Shared loader for `/app/pulse-reports/[id]` and the pulse reports list detail panel.
 */
export async function fetchPulseReportPageData(
  db: Database,
  projectId: number,
  reportId: number,
): Promise<PulseReportPageData | null> {
  const [row] = await db
    .select()
    .from(pulseReports)
    .where(and(eq(pulseReports.id, reportId), eq(pulseReports.projectId, projectId)))
    .limit(1);
  if (!row) {
    return null;
  }

  const periodFeedbacks = await db
    .select({
      id: feedbacks.id,
      title: feedbacks.title,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.projectId, projectId),
        gte(feedbacks.createdAt, row.periodStart),
        lte(feedbacks.createdAt, row.periodEnd),
      ),
    )
    .orderBy(desc(feedbacks.createdAt))
    .limit(50);

  const insightRows = await db
    .select({
      id: insights.id,
      title: insights.title,
      description: insights.description,
    })
    .from(insights)
    .where(
      and(
        eq(insights.projectId, projectId),
        gte(insights.createdAt, row.periodStart),
        lte(insights.createdAt, row.periodEnd),
      ),
    )
    .orderBy(desc(insights.createdAt))
    .limit(10);

  const quickWins = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.projectId, projectId), eq(ideas.ideaType, IDEA_QUICK_WIN)))
    .orderBy(desc(ideas.impactEstimate))
    .limit(5);

  const highImpact = await db
    .select()
    .from(ideas)
    .where(
      and(
        eq(ideas.projectId, projectId),
        inArray(ideas.impactEstimate, [IMPACT_HIGH, IMPACT_TRANS]),
        inArray(ideas.effortEstimate, [EFFORT_TRIVIAL, EFFORT_SMALL]),
      ),
    )
    .orderBy(desc(ideas.impactEstimate))
    .limit(5);

  const ideaIds = [...new Set([...quickWins.map((i) => i.id), ...highImpact.map((i) => i.id)])];
  const prRows =
    ideaIds.length > 0
      ? await db.select().from(ideaPullRequests).where(inArray(ideaPullRequests.ideaId, ideaIds))
      : [];

  const prByIdea = new Map<number, (typeof prRows)[number][]>();
  for (const p of prRows) {
    const list = prByIdea.get(p.ideaId) ?? [];
    list.push(p);
    prByIdea.set(p.ideaId, list);
  }

  const hasPendingPrs = prRows.some((p) => p.status === 0 || p.status === 1);

  return {
    row,
    periodFeedbacks,
    insightRows,
    quickWins,
    highImpact,
    prByIdea,
    hasPendingPrs,
  };
}
