import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { emailRecipients } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { DeleteRecipientButton } from "./DeleteRecipientButton";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";

export default async function RecipientsPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader title="Email recipients" description="Select an active project under Settings." />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Email recipients" />;
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = getDb();
  const rows = await db
    .select()
    .from(emailRecipients)
    .where(eq(emailRecipients.projectId, projectId))
    .orderBy(asc(emailRecipients.email));

  return (
    <PageShell width="full">
      <PageHeader
        title="Email recipients"
        description="Who receives the Kairos daily digest for this project."
        actions={
          canEdit ? (
            <Link href="/app/recipients/new" className="btn btn-primary btn-sm">
              Add recipient
            </Link>
          ) : null
        }
      />

      <ul className="list-group shadow-sm mt-4">
        {rows.length === 0 ? (
          <li className="list-group-item text-body-secondary small">No recipients yet.</li>
        ) : (
          rows.map((r) => (
            <li
              key={r.id}
              className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2"
            >
              <div>
                <p className="fw-medium text-body-emphasis mb-0">{r.name || r.email}</p>
                <p className="small text-body-secondary mb-0">{r.email}</p>
                <p className="small mb-0 mt-1">
                  <span
                    className={`badge rounded-pill ${r.active ? "text-bg-primary" : "border border-secondary text-body-secondary"}`}
                  >
                    {r.active ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
              {canEdit ? (
                <div className="d-flex gap-3 small">
                  <Link href={`/app/recipients/${r.id}/edit`} className="link-primary">
                    Edit
                  </Link>
                  <DeleteRecipientButton recipientId={r.id} />
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </PageShell>
  );
}
