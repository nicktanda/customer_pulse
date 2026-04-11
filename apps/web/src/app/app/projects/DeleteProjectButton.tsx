"use client";

import { ConfirmSubmitForm } from "@/components/ui";
import { deleteProjectAction } from "./actions";

/**
 * Client-only: `ConfirmSubmitForm` runs `confirm()` in the browser before the server action fires.
 */
export function DeleteProjectButton({ projectId }: { projectId: number }) {
  return (
    <ConfirmSubmitForm
      message="Delete this project and all related data?"
      action={deleteProjectAction.bind(null, projectId)}
      className="d-inline"
    >
      <button type="submit" className="btn btn-outline-danger btn-sm">
        Delete
      </button>
    </ConfirmSubmitForm>
  );
}
