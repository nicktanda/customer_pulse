import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { projects, teams } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import {
  ConfirmSubmitForm,
  InlineAlert,
  PageHeader,
  PageShell,
  ProjectAccessDenied,
} from "@/components/ui";
import {
  createTeamAction,
  deleteTeamAction,
  updateBusinessStrategyAction,
  updateTeamAction,
} from "./actions";

/**
 * Strategy tab: one “business” narrative per project plus named teams (objectives + strategy text).
 * V1 does not assign users to teams — teams are planning buckets only.
 */
export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const err = typeof sp.error === "string" ? sp.error : null;

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Strategy"
          description={
            <>
              Select or{" "}
              <Link href="/app/projects/new" className="link-primary">
                create a project
              </Link>{" "}
              first.
            </>
          }
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Strategy" />;
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = getDb();
  const [projectRow] = await db
    .select({
      name: projects.name,
      businessObjectives: projects.businessObjectives,
      businessStrategy: projects.businessStrategy,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const teamRows = await db
    .select()
    .from(teams)
    .where(eq(teams.projectId, projectId))
    .orderBy(asc(teams.name));

  return (
    <PageShell width="full" className="d-flex flex-column gap-4">
      <PageHeader
        title="Strategy"
        description={
          <>
            Project <span className="fw-medium">{projectRow?.name ?? "—"}</span> — align business direction and team-level
            plans. This is internal planning text, separate from customer feedback.
          </>
        }
      />

      {notice ? (
        <InlineAlert variant="success">
          {notice === "saved" && "Business strategy saved."}
          {notice === "team_created" && "Team added."}
          {notice === "team_updated" && "Team updated."}
          {notice === "team_deleted" && "Team removed."}
          {!["saved", "team_created", "team_updated", "team_deleted"].includes(notice) && notice}
        </InlineAlert>
      ) : null}
      {err ? (
        <InlineAlert variant="danger">Something went wrong — check your input and try again.</InlineAlert>
      ) : null}

      <section className="card shadow-sm border-secondary-subtle">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">Business objectives &amp; strategy</h2>
          <p className="small text-body-secondary">
            High-level goals for this workspace (your “business” layer). You can refine these anytime.
          </p>
          {canEdit ? (
            <form action={updateBusinessStrategyAction} className="d-flex flex-column gap-3 mt-3">
              <div>
                <label htmlFor="business_objectives" className="form-label small fw-medium">
                  Objectives
                </label>
                <textarea
                  id="business_objectives"
                  name="business_objectives"
                  className="form-control"
                  rows={4}
                  defaultValue={projectRow?.businessObjectives ?? ""}
                  placeholder="e.g. Grow enterprise adoption, reduce churn in Q2…"
                />
              </div>
              <div>
                <label htmlFor="business_strategy" className="form-label small fw-medium">
                  Strategy
                </label>
                <textarea
                  id="business_strategy"
                  name="business_strategy"
                  className="form-control"
                  rows={4}
                  defaultValue={projectRow?.businessStrategy ?? ""}
                  placeholder="How you plan to get there — themes, bets, non-goals…"
                />
              </div>
              <button type="submit" className="btn btn-primary align-self-start">
                Save business strategy
              </button>
            </form>
          ) : (
            <div className="mt-3 small">
              <p className="fw-medium mb-1">Objectives</p>
              <p className="text-body-secondary mb-3">{projectRow?.businessObjectives || "—"}</p>
              <p className="fw-medium mb-1">Strategy</p>
              <p className="text-body-secondary mb-0">{projectRow?.businessStrategy || "—"}</p>
            </div>
          )}
        </div>
      </section>

      <section className="card shadow-sm border-secondary-subtle">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">Teams</h2>
          <p className="small text-body-secondary mb-0">
            Each team is a named slice of the org (e.g. “Platform”, “Growth”) with its own objectives and strategy.
            Member assignment can come later.
          </p>

          {canEdit ? (
            <form action={createTeamAction} className="row g-2 align-items-end mt-3 pb-4 border-bottom border-secondary-subtle">
              <div className="col-md-3">
                <label className="form-label small mb-0" htmlFor="new_team_name">
                  Name
                </label>
                <input id="new_team_name" name="name" className="form-control form-control-sm" required />
              </div>
              <div className="col-md-4">
                <label className="form-label small mb-0" htmlFor="new_team_objectives">
                  Objectives
                </label>
                <textarea
                  id="new_team_objectives"
                  name="objectives"
                  className="form-control form-control-sm"
                  rows={2}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small mb-0" htmlFor="new_team_strategy">
                  Strategy
                </label>
                <textarea
                  id="new_team_strategy"
                  name="strategy"
                  className="form-control form-control-sm"
                  rows={2}
                />
              </div>
              <div className="col-md-1">
                <button type="submit" className="btn btn-sm btn-outline-primary w-100">
                  Add
                </button>
              </div>
            </form>
          ) : null}

          <ul className="list-unstyled d-flex flex-column gap-4 mt-4 mb-0">
            {teamRows.length === 0 ? (
              <li className="text-body-secondary small">No teams yet.{canEdit ? " Add one above." : ""}</li>
            ) : (
              teamRows.map((t) => (
                <li key={t.id} className="border rounded p-3 bg-body-secondary bg-opacity-25">
                  {canEdit ? (
                    <form action={updateTeamAction} className="d-flex flex-column gap-2">
                      <input type="hidden" name="id" value={t.id} />
                      <div className="row g-2">
                        <div className="col-md-4">
                          <label className="form-label small mb-0">Name</label>
                          <input name="name" className="form-control form-control-sm" defaultValue={t.name} required />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-0">Objectives</label>
                          <textarea
                            name="objectives"
                            className="form-control form-control-sm"
                            rows={3}
                            defaultValue={t.objectives ?? ""}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-0">Strategy</label>
                          <textarea
                            name="strategy"
                            className="form-control form-control-sm"
                            rows={3}
                            defaultValue={t.strategy ?? ""}
                          />
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-sm btn-primary">
                          Save team
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="fw-semibold mb-2">{t.name}</p>
                      <p className="small mb-1">
                        <span className="text-body-secondary">Objectives:</span> {t.objectives || "—"}
                      </p>
                      <p className="small mb-0">
                        <span className="text-body-secondary">Strategy:</span> {t.strategy || "—"}
                      </p>
                    </>
                  )}
                  {canEdit ? (
                    <ConfirmSubmitForm
                      action={deleteTeamAction}
                      className="mt-2"
                      message={`Remove team “${t.name}”? This cannot be undone.`}
                    >
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="btn btn-sm btn-link text-danger p-0 text-decoration-none">
                        Remove team
                      </button>
                    </ConfirmSubmitForm>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
