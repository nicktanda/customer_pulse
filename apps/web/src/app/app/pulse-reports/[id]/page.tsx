import { notFound, redirect } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { formatAppDate, formatAppDateTime } from "@/lib/format-app-date";
import { fetchPulseReportPageData } from "@/lib/pulse-report-page-data";
import { PulseReportDetailBody } from "@/components/pulse-reports/PulseReportDetailBody";

export default async function PulseReportShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/pulse-reports");
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = getDb();
  const data = await fetchPulseReportPageData(db, projectId, id);
  if (!data) {
    notFound();
  }

  const row = data.row;
  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const err = typeof sp.error === "string" ? sp.error : null;

  return (
    <PageShell width="full">
      <PageHeader
        title={`${formatAppDate(row.periodStart)} – ${formatAppDate(row.periodEnd)}`}
        description={
          <>
            Report #{row.id}
            {row.sentAt ? (
              <>
                {" "}
                · Sent {formatAppDateTime(row.sentAt)}
              </>
            ) : (
              " · Not sent yet"
            )}
          </>
        }
        back={{ href: "/app/pulse-reports", label: "Pulse reports" }}
      />

      <PulseReportDetailBody data={data} canEdit={canEdit} notice={notice} err={err} variant="page" />
    </PageShell>
  );
}
