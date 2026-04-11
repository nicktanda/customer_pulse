import { createProjectAction } from "../actions";
import { FormActions, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";

export default function NewProjectPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="New project"
        description="Creates a project and makes you the owner."
        back={{ href: "/app/projects", label: "Projects" }}
      />
      <NarrowCardForm action={createProjectAction} className="mt-4">
        <div>
          <label htmlFor="new-proj-name" className="form-label">
            Name
          </label>
          <input
            id="new-proj-name"
            name="name"
            required
            className="form-control"
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label htmlFor="new-proj-desc" className="form-label">
            Description (optional)
          </label>
          <textarea id="new-proj-desc" name="description" rows={3} className="form-control" />
        </div>
        <FormActions variant="plain">
          <button type="submit" className="btn btn-primary">
            Create project
          </button>
        </FormActions>
      </NarrowCardForm>
    </PageShell>
  );
}
