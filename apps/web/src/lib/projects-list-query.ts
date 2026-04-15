/**
 * Query strings for `/app/projects` (optional detail panel for one project).
 */
export type ProjectsListQuery = {
  detail?: number;
};

export function serializeProjectsListQuery(sp: ProjectsListQuery): string {
  const qs = new URLSearchParams();
  if (sp.detail != null && Number.isFinite(sp.detail) && sp.detail > 0) {
    qs.set("detail", String(sp.detail));
  }
  return qs.toString();
}

export function projectsListHref(sp: ProjectsListQuery): string {
  const s = serializeProjectsListQuery(sp);
  return s ? `/app/projects?${s}` : "/app/projects";
}
