"use client";

import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import type { UserProjectRow } from "@/lib/project-types";

/**
 * Dropdown that switches the active project by navigating to `/app/set-project`, which sets an httpOnly cookie.
 * After the redirect, the whole app sees the new project (dashboard, feedback, integrations, etc.).
 */
export function ProjectSwitcher({
  projects,
  currentProjectId,
  /** When false, hide the built-in label (e.g. when a Settings card already has a section heading). */
  showLabel = true,
}: {
  projects: UserProjectRow[];
  currentProjectId: number | null;
  showLabel?: boolean;
}) {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <p className="mt-2 small rounded px-2 py-2 border border-secondary-subtle bg-body-secondary text-body-secondary mb-0">
        No projects yet — create one under Projects.
      </p>
    );
  }

  return (
    <Form.Group className="mb-0" controlId="current-project">
      {showLabel ? (
        <Form.Label className="small text-body-secondary">Current project</Form.Label>
      ) : null}
      <Form.Select
        size="sm"
        value={currentProjectId ?? projects[0]!.projectId}
        onChange={(e) => {
          const id = e.target.value;
          if (id) {
            router.push(`/app/set-project?id=${id}`);
          }
        }}
      >
        {projects.map((p) => (
          <option key={p.projectId} value={p.projectId}>
            {p.name}
            {p.isOwner ? " (owner)" : ""}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}
