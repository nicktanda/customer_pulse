"use client";

import { ConfirmSubmitForm } from "@/components/ui";
import { deleteIntegrationAction } from "./actions";

export function DeleteIntegrationButton({ integrationId }: { integrationId: number }) {
  return (
    <ConfirmSubmitForm
      message="Remove this integration?"
      action={deleteIntegrationAction.bind(null, integrationId)}
      className="d-inline"
    >
      <button type="submit" className="btn btn-link btn-sm text-danger p-0 text-decoration-none">
        Delete
      </button>
    </ConfirmSubmitForm>
  );
}
