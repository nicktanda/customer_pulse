import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { PageHeader, PageShell } from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbackInsights, feedbacks, insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { formatAppDateTime } from "@/lib/format-app-date";
import { InsightDetailBody } from "@/components/insights/InsightDetailBody";

/**
 * One insight row, with evidence JSON and feedback linked through `feedback_insights`.
 */
export default async function InsightShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/insights");
  }

  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(insights)
    .where(and(eq(insights.id, id), eq(insights.projectId, projectId)))
    .limit(1);

  if (!row) {
    notFound();
  }

  const linkedFeedback = await db
    .select({
      feedbackId: feedbacks.id,
      title: feedbacks.title,
      relevanceScore: feedbackInsights.relevanceScore,
      contributionSummary: feedbackInsights.contributionSummary,
    })
    .from(feedbackInsights)
    .innerJoin(feedbacks, eq(feedbackInsights.feedbackId, feedbacks.id))
    .where(and(eq(feedbackInsights.insightId, id), eq(feedbacks.projectId, projectId)))
    .orderBy(asc(feedbacks.id));

  const when = row.discoveredAt ?? row.createdAt;

  return (
    <PageShell width="full">
      <PageHeader
        title={row.title}
        description={
          <>
            Insight #{row.id} · {formatAppDateTime(when)}
            {row.affectedUsersCount > 0 ? (
              <>
                {" "}
                · ~{row.affectedUsersCount} affected users (estimate)
              </>
            ) : null}
          </>
        }
        back={{ href: "/app/insights", label: "Insights" }}
      />

      <InsightDetailBody row={row} linkedFeedback={linkedFeedback} />
    </PageShell>
  );
}
