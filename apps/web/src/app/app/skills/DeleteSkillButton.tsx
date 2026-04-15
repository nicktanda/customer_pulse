"use client";

import { ConfirmSubmitForm } from "@/components/ui";
import { deleteSkillAction } from "./actions";

export function DeleteSkillButton({ skillId }: { skillId: number }) {
  return (
    <ConfirmSubmitForm
      message="Delete this skill?"
      action={deleteSkillAction.bind(null, skillId)}
      className="d-inline"
    >
      <button type="submit" className="btn btn-link btn-sm text-danger p-0 text-decoration-none">
        Delete
      </button>
    </ConfirmSubmitForm>
  );
}
