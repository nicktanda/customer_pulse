import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PageHeader, PageShell } from "@/components/ui";
import { DiscoveryActivityWorkspace } from "@/components/discovery/DiscoveryActivityWorkspace";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { getActivityById } from "@customer-pulse/db/queries/discovery";

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
 * Full-page activity workspace — same two-column UI as Discover home, with breadcrumb chrome.
 */
export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const { id: idStr } = await params;
  const { note: noteParam } = await searchParams;
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

  const [insight] = await db
    .select({ id: insights.id, title: insights.title })
    .from(insights)
    .where(and(eq(insights.id, activity.insightId), eq(insights.projectId, projectId)))
    .limit(1);

  const isAssumptionMap = activity.activityType === 3;
  const showEmptyFindingsNote = noteParam === "empty_findings" && isAssumptionMap;

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
          <Link
            href={`/app/discover?insight=${activity.insightId}`}
            className="btn btn-outline-primary btn-sm"
          >
            All tools on Discover
          </Link>
        }
      />

      <DiscoveryActivityWorkspace
        activity={activity}
        insightTitle={insight?.title ?? null}
        showEmptyFindingsNote={showEmptyFindingsNote}
        toolbar={
          <p className="small text-body-secondary mb-0">
            Prefer one screen for every tool?{" "}
            <Link href={`/app/discover?insight=${activity.insightId}`} className="fw-medium">
              Open Discover home
            </Link>{" "}
            for this insight.
          </p>
        }
      />
    </PageShell>
  );
}
