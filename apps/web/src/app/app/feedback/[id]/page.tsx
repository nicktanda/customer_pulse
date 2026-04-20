import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PageHeader, PageShell } from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbacks } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess, userCanEditProject } from "@/lib/project-access";
import { formatAppDateTime } from "@/lib/format-app-date";
import { FeedbackDetailBody } from "@/components/feedback/FeedbackDetailBody";
import { getAdjacentFeedbackIds } from "@/lib/feedback-adjacent";

export default async function FeedbackShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idStr } = await params;
  const feedbackId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(feedbackId)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/feedback");
  }

  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.projectId, projectId)))
    .limit(1);

  if (!row) {
    notFound();
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;

  const { newerId, olderId } = await getAdjacentFeedbackIds(db, projectId, row);

  return (
    <PageShell width="wide">
      <PageHeader
        title={row.title || "(no title)"}
        description={
          <>
            <span className="text-body-tertiary">#{row.id}</span>
            {row.createdAt ? (
              <>
                {" "}
                · Received{" "}
                <time dateTime={row.createdAt.toISOString()} title={row.createdAt.toISOString()}>
                  {formatAppDateTime(row.createdAt)}
                </time>
              </>
            ) : null}
          </>
        }
        back={{ href: "/app/feedback", label: "Feedback" }}
        actions={
          <div className="d-flex flex-wrap gap-2" role="navigation" aria-label="Adjacent feedback">
            {newerId != null ? (
              <Link href={`/app/feedback/${newerId}`} className="btn btn-sm btn-outline-secondary">
                ← Previous
              </Link>
            ) : (
              <span className="btn btn-sm btn-outline-secondary disabled" aria-disabled="true">
                ← Previous
              </span>
            )}
            {olderId != null ? (
              <Link href={`/app/feedback/${olderId}`} className="btn btn-sm btn-outline-secondary">
                Next →
              </Link>
            ) : (
              <span className="btn btn-sm btn-outline-secondary disabled" aria-disabled="true">
                Next →
              </span>
            )}
          </div>
        }
      />

      <FeedbackDetailBody
        row={row}
        feedbackId={feedbackId}
        canEdit={canEdit}
        notice={notice}
        listReturnPath={null}
        variant="page"
      />
    </PageShell>
  );
}
