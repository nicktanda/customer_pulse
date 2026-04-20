import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { projects, projectUsers, projectInvitations, users } from "@customer-pulse/db/client";
import { userHasProjectAccess, userIsProjectOwner } from "@/lib/project-access";
import { addProjectMemberAction, removeProjectMemberAction, cancelInvitationAction } from "../../actions";
import { InlineAlert, PageHeader, PageShell } from "@/components/ui";

export default async function ProjectMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idStr } = await params;
  const sp = await searchParams;
  const projectId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(projectId)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  if (!(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/projects");
  }

  const isOwner = await userIsProjectOwner(userId, projectId);
  const db = await getRequestDb();
  const [proj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!proj) {
    notFound();
  }

  const members = await db
    .select({
      puId: projectUsers.id,
      email: users.email,
      name: users.name,
      isOwner: projectUsers.isOwner,
    })
    .from(projectUsers)
    .innerJoin(users, eq(projectUsers.userId, users.id))
    .where(eq(projectUsers.projectId, projectId))
    .orderBy(desc(projectUsers.isOwner));

  const pendingInvites = isOwner
    ? await db
        .select({
          piId: projectInvitations.id,
          email: projectInvitations.email,
          createdAt: projectInvitations.createdAt,
        })
        .from(projectInvitations)
        .where(eq(projectInvitations.projectId, projectId))
        .orderBy(desc(projectInvitations.createdAt))
    : [];

  const err = typeof sp.error === "string" ? sp.error : undefined;
  const errorMsg =
    err === "email"
      ? "Email is required."
      : err === "nouser"
        ? "No user with that email — they must sign up first."
        : err === "dup"
          ? "That user is already on the project."
          : err === "dup_invite"
            ? "That email has already been invited."
            : err === "remove"
              ? "Could not remove member (owners cannot be removed)."
              : null;

  return (
    <PageShell width="full">
      <PageHeader
        title="Team members"
        description="Owners can add or remove members for this project."
        back={{ href: `/app/projects/${projectId}`, label: proj.name }}
      />

      {errorMsg ? <InlineAlert variant="danger">{errorMsg}</InlineAlert> : null}

      {isOwner ? (
        <form
          action={addProjectMemberAction.bind(null, projectId)}
          className="card shadow-sm border-secondary-subtle mt-4"
          style={{ maxWidth: "28rem" }}
        >
          <div className="card-body d-flex flex-wrap align-items-end gap-2">
            <div className="flex-grow-1" style={{ minWidth: "200px" }}>
              <label htmlFor="member-email" className="form-label small mb-1">
                Add by email
              </label>
              <input
                id="member-email"
                name="email"
                type="email"
                required
                placeholder="teammate@company.com"
                className="form-control form-control-sm"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Add
            </button>
          </div>
        </form>
      ) : null}

      <ul className="list-group shadow-sm mt-4">
        {members.map((m) => (
          <li
            key={m.puId}
            className="list-group-item d-flex align-items-center justify-content-between gap-3 flex-wrap"
          >
            <div>
              <p className="fw-medium text-body-emphasis mb-0">{m.name || m.email}</p>
              <p className="small text-body-secondary mb-0">{m.email}</p>
              {m.isOwner ? <span className="badge text-bg-secondary mt-1">owner</span> : null}
            </div>
            {isOwner && !m.isOwner ? (
              <form action={removeProjectMemberAction.bind(null, projectId, m.puId)}>
                <button type="submit" className="btn btn-link btn-sm text-danger p-0 text-decoration-none">
                  Remove
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      {isOwner && pendingInvites.length > 0 ? (
        <>
          <h2 className="h6 mt-4 mb-2 text-body-secondary">Pending invitations</h2>
          <ul className="list-group shadow-sm">
            {pendingInvites.map((inv) => (
              <li
                key={inv.piId}
                className="list-group-item d-flex align-items-center justify-content-between gap-3 flex-wrap"
              >
                <div>
                  <p className="text-body-secondary mb-0">{inv.email}</p>
                  <span className="badge text-bg-warning mt-1">pending signup</span>
                </div>
                <form action={cancelInvitationAction.bind(null, projectId, inv.piId)}>
                  <button type="submit" className="btn btn-link btn-sm text-danger p-0 text-decoration-none">
                    Cancel
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </PageShell>
  );
}
