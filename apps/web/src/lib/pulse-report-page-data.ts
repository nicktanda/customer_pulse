import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import {
  feedbacks,
  ideas,
  ideaInsights,
  insights,
  ideaPullRequests,
  integrations,
  pulseReports,
} from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";

const PR_STATUS_PENDING = 0;
const PR_STATUS_OPEN = 1;
const PR_STATUS_MERGED = 2;
const PR_STATUS_CLOSED = 3;

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
  prByIdea: Map<number, { status: number; progressMessage: string | null; prNumber: number | null; prUrl: string | null; errorMessage: string | null }[]>;
  hasPendingPrs: boolean;
};

/** Pick the top-ranked idea per insight so every insight is represented. */
function bestPerInsight(
  rows: { idea: typeof ideas.$inferSelect; insightId: number }[],
): (typeof ideas.$inferSelect)[] {
  const seen = new Set<number>();
  const result: (typeof ideas.$inferSelect)[] = [];
  for (const { idea, insightId } of rows) {
    if (seen.has(insightId)) continue;
    seen.add(insightId);
    result.push(idea);
  }
  return result;
}

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

  // Use row.createdAt (set after the AI pipeline finishes) as the upper bound,
  // not row.periodEnd (set before the pipeline runs), so insights generated
  // during the pipeline are included.
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
        lte(insights.createdAt, row.createdAt),
      ),
    )
    .orderBy(desc(insights.createdAt))
    .limit(10);

  // Fetch a wider pool, then pick the best idea per insight so all insights
  // are represented rather than one insight dominating the list.
  const quickWinCandidates = await db
    .select({ idea: ideas, insightId: ideaInsights.insightId })
    .from(ideas)
    .innerJoin(ideaInsights, eq(ideaInsights.ideaId, ideas.id))
    .where(and(eq(ideas.projectId, projectId), eq(ideas.ideaType, IDEA_QUICK_WIN)))
    .orderBy(desc(ideas.impactEstimate));
  const quickWins = bestPerInsight(quickWinCandidates);

  const highImpactCandidates = await db
    .select({ idea: ideas, insightId: ideaInsights.insightId })
    .from(ideas)
    .innerJoin(ideaInsights, eq(ideaInsights.ideaId, ideas.id))
    .where(
      and(
        eq(ideas.projectId, projectId),
        inArray(ideas.impactEstimate, [IMPACT_HIGH, IMPACT_TRANS]),
        inArray(ideas.effortEstimate, [EFFORT_TRIVIAL, EFFORT_SMALL]),
      ),
    )
    .orderBy(desc(ideas.impactEstimate));
  const highImpact = bestPerInsight(highImpactCandidates);

  const ideaIds = [...new Set([...quickWins.map((i) => i.id), ...highImpact.map((i) => i.id)])];
  let prRows =
    ideaIds.length > 0
      ? await db.select().from(ideaPullRequests).where(inArray(ideaPullRequests.ideaId, ideaIds))
      : [];

  // Sync open PRs with GitHub — if a PR was closed on GitHub, update our status.
  const openPrs = prRows.filter((p) => p.status === PR_STATUS_OPEN && p.prNumber);
  if (openPrs.length > 0) {
    const synced = await syncOpenPrStatuses(db, projectId, openPrs);
    if (synced) {
      // Re-fetch after status updates
      prRows = ideaIds.length > 0
        ? await db.select().from(ideaPullRequests).where(inArray(ideaPullRequests.ideaId, ideaIds))
        : [];
    }
  }

  const prByIdea = new Map<number, (typeof prRows)[number][]>();
  for (const p of prRows) {
    const list = prByIdea.get(p.ideaId) ?? [];
    list.push(p);
    prByIdea.set(p.ideaId, list);
  }

  const hasPendingPrs = prRows.some((p) => p.status === PR_STATUS_PENDING);

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

/**
 * Check GitHub for the current state of open PRs and update any that have been
 * closed or merged. Returns true if any rows were updated.
 */
async function syncOpenPrStatuses(
  db: Database,
  projectId: number,
  openPrs: { id: number; integrationId: number; prNumber: number | null }[],
): Promise<boolean> {
  const masterKey = process.env.LOCKBOX_MASTER_KEY?.trim();
  if (!masterKey) return false;

  // All PRs share the same GitHub integration for this project — load it once.
  const integrationId = openPrs[0]?.integrationId;
  if (!integrationId) return false;

  const [gh] = await db
    .select({ ciphertext: integrations.credentialsCiphertext })
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);
  if (!gh?.ciphertext) return false;

  let creds: { access_token: string; owner: string; repo: string };
  try {
    const decrypted = decryptCredentialsColumn(gh.ciphertext, masterKey);
    creds = JSON.parse(decrypted);
  } catch {
    return false;
  }

  const headers = {
    Authorization: `token ${creds.access_token}`,
    Accept: "application/vnd.github.v3+json",
  };

  let updated = false;
  for (const pr of openPrs) {
    if (!pr.prNumber) continue;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${creds.owner}/${creds.repo}/pulls/${pr.prNumber}`,
        { headers, next: { revalidate: 0 } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { state?: string; merged?: boolean };
      const now = new Date();
      if (data.merged) {
        await db.update(ideaPullRequests).set({ status: PR_STATUS_MERGED, mergedAt: now, updatedAt: now }).where(eq(ideaPullRequests.id, pr.id));
        updated = true;
      } else if (data.state === "closed") {
        await db.update(ideaPullRequests).set({ status: PR_STATUS_CLOSED, updatedAt: now }).where(eq(ideaPullRequests.id, pr.id));
        updated = true;
      }
    } catch {
      // Network error — skip, will retry next page load
    }
  }
  return updated;
}
