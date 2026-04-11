"use client";

import { ConfirmSubmitForm } from "@/components/ui";
import { deleteRecipientAction } from "./actions";

export function DeleteRecipientButton({ recipientId }: { recipientId: number }) {
  return (
    <ConfirmSubmitForm
      message="Remove this recipient?"
      action={deleteRecipientAction.bind(null, recipientId)}
      className="d-inline"
    >
      <button type="submit" className="btn btn-link btn-sm text-danger p-0 text-decoration-none">
        Remove
      </button>
    </ConfirmSubmitForm>
  );
}
