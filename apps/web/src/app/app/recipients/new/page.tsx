import { createRecipientAction } from "../actions";
import { FormActions, InlineAlert, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";

export default async function NewRecipientPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : null;

  return (
    <PageShell width="narrow">
      <PageHeader title="Add recipient" back={{ href: "/app/recipients", label: "Recipients" }} />
      {err === "dup" ? (
        <InlineAlert variant="danger">That email is already on this project.</InlineAlert>
      ) : null}
      <NarrowCardForm action={createRecipientAction} className="mt-4">
        <div>
          <label htmlFor="new-recipient-email" className="form-label">
            Email
          </label>
          <input id="new-recipient-email" name="email" type="email" required className="form-control" />
        </div>
        <div>
          <label htmlFor="new-recipient-name" className="form-label">
            Name (optional)
          </label>
          <input id="new-recipient-name" name="name" className="form-control" />
        </div>
        <FormActions variant="plain">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </FormActions>
      </NarrowCardForm>
    </PageShell>
  );
}
