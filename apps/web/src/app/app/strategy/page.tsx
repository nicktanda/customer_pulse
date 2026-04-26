import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { Target, Users, Plus, Save } from "lucide-react";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { projects, teams } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import {
  InlineAlert,
  PageHeader,
  PageShell,
  ProjectAccessDenied,
} from "@/components/ui";
import {
  createTeamAction,
  updateBusinessStrategyAction,
  updateTeamAction,
} from "./actions";
import { DeleteTeamButton } from "./DeleteTeamButton";

/**
 * Strategy tab: one "business" narrative per project plus named teams (objectives + strategy text).
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
  const db = await getRequestDb();
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

  const hasBusinessContent =
    projectRow?.businessObjectives || projectRow?.businessStrategy;

  return (
    <PageShell width="full" className="d-flex flex-column gap-4">
      <PageHeader
        title="Strategy"
        description={
          <>
            Project <span className="fw-semibold">{projectRow?.name ?? "—"}</span> — align business
            direction and team-level plans.
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

      {/* ── Business objectives & strategy ─────────────────────────────────── */}
      <section className="card border-secondary-subtle shadow-sm">
        <div className="card-body p-4">
          {/* Section header row */}
          <div className="d-flex align-items-center gap-2 mb-1">
            <Target
              size={16}
              style={{ opacity: 0.7, color: "var(--bs-body-color)" }}
              aria-hidden="true"
            />
            <h2 className="h5 text-body-emphasis fw-semibold mb-0">
              Business objectives &amp; strategy
            </h2>
          </div>
          <p className="small text-body-secondary mb-0" style={{ paddingLeft: "1.5rem" }}>
            Company-wide direction for this workspace — the &ldquo;why&rdquo; and &ldquo;how&rdquo; behind everything you
            build.
          </p>

          {canEdit ? (
            /* ── Edit mode: full form ──────────────────────────────────────── */
            <form action={updateBusinessStrategyAction} className="d-flex flex-column gap-3 mt-4">
              <div>
                <label htmlFor="business_objectives" className="form-label fw-semibold small mb-1">
                  Objectives
                </label>
                <p className="small text-body-tertiary mb-2">
                  What does success look like? e.g. grow enterprise adoption, reduce churn in Q2.
                </p>
                <textarea
                  id="business_objectives"
                  name="business_objectives"
                  className="form-control"
                  rows={5}
                  defaultValue={projectRow?.businessObjectives ?? ""}
                  placeholder="e.g. Grow enterprise adoption, reduce churn in Q2…"
                />
              </div>
              <div>
                <label htmlFor="business_strategy" className="form-label fw-semibold small mb-1">
                  Strategy
                </label>
                <p className="small text-body-tertiary mb-2">
                  How will you get there? Themes, bets, trade-offs, and things you are not doing.
                </p>
                <textarea
                  id="business_strategy"
                  name="business_strategy"
                  className="form-control"
                  rows={5}
                  defaultValue={projectRow?.businessStrategy ?? ""}
                  placeholder="How you plan to get there — themes, bets, non-goals…"
                />
              </div>
              <div>
                <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2">
                  <Save size={14} aria-hidden="true" />
                  Save business strategy
                </button>
              </div>
            </form>
          ) : hasBusinessContent ? (
            /* ── Read-only: labeled content blocks ────────────────────────── */
            <div className="d-flex flex-column gap-3 mt-4">
              <div
                className="rounded p-3"
                style={{ backgroundColor: "var(--bs-tertiary-bg)" }}
              >
                <p className="mode-section-label text-body-secondary mb-2">Objectives</p>
                <p className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>
                  {projectRow?.businessObjectives || "—"}
                </p>
              </div>
              <div
                className="rounded p-3"
                style={{ backgroundColor: "var(--bs-tertiary-bg)" }}
              >
                <p className="mode-section-label text-body-secondary mb-2">Strategy</p>
                <p className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>
                  {projectRow?.businessStrategy || "—"}
                </p>
              </div>
            </div>
          ) : (
            /* ── Read-only: nothing set yet ────────────────────────────────── */
            <div
              className="rounded p-4 text-center mt-4"
              style={{ backgroundColor: "var(--bs-tertiary-bg)" }}
            >
              <Target size={24} style={{ opacity: 0.35, color: "var(--bs-body-color)" }} aria-hidden="true" />
              <p className="small text-body-secondary mt-2 mb-0">
                No business strategy has been set for this project yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Teams ──────────────────────────────────────────────────────────── */}
      <section className="card border-secondary-subtle shadow-sm">
        <div className="card-body p-4">
          {/* Section header row with team count badge */}
          <div className="d-flex align-items-center gap-2 mb-1">
            <Users
              size={16}
              style={{ opacity: 0.7, color: "var(--bs-body-color)" }}
              aria-hidden="true"
            />
            <h2 className="h5 text-body-emphasis fw-semibold mb-0">Teams</h2>
            {teamRows.length > 0 && (
              <span className="badge text-bg-secondary">{teamRows.length}</span>
            )}
          </div>
          <p className="small text-body-secondary mb-0" style={{ paddingLeft: "1.5rem" }}>
            Each team is a named slice of the org — e.g. &ldquo;Platform&rdquo;, &ldquo;Growth&rdquo; — with its own
            objectives and strategy.
          </p>

          {/* ── Team list ─────────────────────────────────────────────────── */}
          <ul className="list-unstyled d-flex flex-column gap-3 mt-4 mb-0">
            {teamRows.length === 0 ? (
              /* Empty state */
              <li
                className="rounded p-4 text-center"
                style={{ backgroundColor: "var(--bs-tertiary-bg)" }}
              >
                <Users size={24} style={{ opacity: 0.35, color: "var(--bs-body-color)" }} aria-hidden="true" />
                <p className="fw-semibold small text-body-emphasis mt-2 mb-1">No teams yet</p>
                <p className="small text-body-secondary mb-0">
                  {canEdit
                    ? "Add a team below to define a slice of the organisation — each team gets its own objectives and strategy."
                    : "No teams have been added for this project yet."}
                </p>
              </li>
            ) : (
              teamRows.map((t) => (
                <li key={t.id} className="border border-secondary-subtle rounded p-3">
                  {/* Team header row — avatar circle + name + (edit mode) trash icon */}
                  <div className="d-flex align-items-center gap-2 mb-3">
                    {/* First-letter avatar circle */}
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle fw-semibold text-white"
                      style={{
                        width: "2rem",
                        height: "2rem",
                        fontSize: "0.8rem",
                        flexShrink: 0,
                        backgroundColor: "var(--bs-primary)",
                      }}
                      aria-hidden="true"
                    >
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="fw-semibold text-body-emphasis">{t.name}</span>
                    {canEdit && (
                      <span className="ms-auto">
                        <DeleteTeamButton teamId={t.id} teamName={t.name} />
                      </span>
                    )}
                  </div>

                  {canEdit ? (
                    <>
                      {/* Edit form — name full-width, then 2-col objectives + strategy */}
                      <form action={updateTeamAction} className="d-flex flex-column gap-3">
                        <input type="hidden" name="id" value={t.id} />
                        <div>
                          <label className="form-label fw-semibold small mb-1">Name</label>
                          <input
                            name="name"
                            className="form-control form-control-sm"
                            defaultValue={t.name}
                            required
                          />
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small mb-1">Objectives</label>
                            <textarea
                              name="objectives"
                              className="form-control form-control-sm"
                              rows={4}
                              defaultValue={t.objectives ?? ""}
                              placeholder="What this team is working towards…"
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small mb-1">Strategy</label>
                            <textarea
                              name="strategy"
                              className="form-control form-control-sm"
                              rows={4}
                              defaultValue={t.strategy ?? ""}
                              placeholder="How this team plans to get there…"
                            />
                          </div>
                        </div>
                        <div>
                          <button
                            type="submit"
                            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2"
                          >
                            <Save size={13} aria-hidden="true" />
                            Save team
                          </button>
                        </div>
                      </form>

                    </>
                  ) : (
                    /* Read-only view: labeled content blocks */
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="rounded p-3 h-100" style={{ backgroundColor: "var(--bs-tertiary-bg)" }}>
                          <p className="mode-section-label text-body-secondary mb-2">Objectives</p>
                          <p className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>
                            {t.objectives || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="rounded p-3 h-100" style={{ backgroundColor: "var(--bs-tertiary-bg)" }}>
                          <p className="mode-section-label text-body-secondary mb-2">Strategy</p>
                          <p className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>
                            {t.strategy || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>

          {/* ── Add team form (editors only) ──────────────────────────────── */}
          {canEdit && (
            <div className="mt-4 pt-4 border-top border-secondary-subtle">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Plus size={15} style={{ opacity: 0.7, color: "var(--bs-body-color)" }} aria-hidden="true" />
                <h3 className="h6 text-body-emphasis fw-semibold mb-0">Add a team</h3>
              </div>
              <form action={createTeamAction} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label fw-semibold small mb-1" htmlFor="new_team_name">
                    Name
                  </label>
                  <input
                    id="new_team_name"
                    name="name"
                    className="form-control form-control-sm"
                    placeholder="e.g. Platform, Growth, Design…"
                    required
                  />
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label
                      className="form-label fw-semibold small mb-1"
                      htmlFor="new_team_objectives"
                    >
                      Objectives{" "}
                      <span className="fw-normal text-body-tertiary">(optional)</span>
                    </label>
                    <textarea
                      id="new_team_objectives"
                      name="objectives"
                      className="form-control form-control-sm"
                      rows={4}
                      placeholder="What this team is working towards…"
                    />
                  </div>
                  <div className="col-md-6">
                    <label
                      className="form-label fw-semibold small mb-1"
                      htmlFor="new_team_strategy"
                    >
                      Strategy{" "}
                      <span className="fw-normal text-body-tertiary">(optional)</span>
                    </label>
                    <textarea
                      id="new_team_strategy"
                      name="strategy"
                      className="form-control form-control-sm"
                      rows={4}
                      placeholder="How this team plans to get there…"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-2"
                  >
                    <Plus size={14} aria-hidden="true" />
                    Add team
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
