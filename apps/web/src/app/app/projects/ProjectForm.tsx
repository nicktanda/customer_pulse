import { FormActions, NarrowCardForm } from "@/components/ui";
import { updateProjectAction } from "./actions";

/** Server form wrapper so we can pass `projectId` into the server action safely. */
export function ProjectEditForm({
  projectId,
  defaultName,
  defaultDescription,
}: {
  projectId: number;
  defaultName: string;
  defaultDescription: string | null;
}) {
  return (
    <NarrowCardForm action={updateProjectAction.bind(null, projectId)} className="mt-4">
      <div>
        <label htmlFor="proj-name" className="form-label">
          Name
        </label>
        <input
          id="proj-name"
          name="name"
          required
          defaultValue={defaultName}
          className="form-control"
        />
      </div>
      <div>
        <label htmlFor="proj-desc" className="form-label">
          Description
        </label>
        <textarea
          id="proj-desc"
          name="description"
          rows={3}
          defaultValue={defaultDescription ?? ""}
          className="form-control"
        />
      </div>
      <FormActions variant="plain">
        <button type="submit" className="btn btn-primary">
          Save changes
        </button>
      </FormActions>
    </NarrowCardForm>
  );
}
