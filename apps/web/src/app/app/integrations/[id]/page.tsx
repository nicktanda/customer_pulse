import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { integrations } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { INTEGRATION_SOURCE_LABELS } from "@/lib/integration-source-meta";
import { PageHeader, PageShell } from "@/components/ui";
import { IntegrationDetailPanel } from "@/components/integrations/IntegrationDetailPanel";

export default async function IntegrationShowPage({
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
    redirect("/app/integrations");
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = getDb();
  const [row] = await db.select().from(integrations).where(eq(integrations.id, id)).limit(1);
  if (!row || row.projectId !== projectId) {
    notFound();
  }

  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;

  return (
    <PageShell width="medium">
      <PageHeader
        title={row.name}
        description={`${INTEGRATION_SOURCE_LABELS[row.sourceType] ?? row.sourceType} · #${row.id}`}
        back={{ href: "/app/integrations", label: "Integrations" }}
      />

      <IntegrationDetailPanel row={row} canEdit={canEdit} notice={notice} />
    </PageShell>
  );
}
