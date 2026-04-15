import { createSkillAction } from "../actions";
import { FormActions, InlineAlert, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";

export default async function NewSkillPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : null;

  return (
    <PageShell width="narrow">
      <PageHeader title="New skill" back={{ href: "/app/skills", label: "Skills" }} />
      {err === "dup" ? (
        <InlineAlert variant="danger">A skill with that name already exists.</InlineAlert>
      ) : null}
      {err === "required" ? (
        <InlineAlert variant="danger">Name, title, and content are required.</InlineAlert>
      ) : null}
      <NarrowCardForm action={createSkillAction} className="mt-4">
        <div>
          <label htmlFor="new-skill-name" className="form-label">
            Name
          </label>
          <input id="new-skill-name" name="name" required className="form-control" placeholder="e.g. triage-bugs" />
          <div className="form-text">Unique identifier (lowercase, hyphens ok).</div>
        </div>
        <div>
          <label htmlFor="new-skill-title" className="form-label">
            Title
          </label>
          <input id="new-skill-title" name="title" required className="form-control" placeholder="e.g. Bug Triage Workflow" />
        </div>
        <div>
          <label htmlFor="new-skill-description" className="form-label">
            Description (optional)
          </label>
          <input id="new-skill-description" name="description" className="form-control" />
        </div>
        <div>
          <label htmlFor="new-skill-content" className="form-label">
            Content
          </label>
          <textarea id="new-skill-content" name="content" required rows={10} className="form-control" />
          <div className="form-text">The full skill instructions or template.</div>
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
