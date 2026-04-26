import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import {
  FormActions,
  InlineAlert,
  NarrowCardForm,
  PageHeader,
  PageShell,
  ProjectAccessDenied,
} from "@/components/ui";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { insights } from "@customer-pulse/db/client";
import { createSpecAction } from "../../actions";
import { SpecSubmitButton } from "./SpecSubmitButton";

/**
 * New spec form — lets a PM manually create a spec with a title, description,
 * and optional links to existing insights (the golden thread).
 *
 * Supports a `?from_insight=<id>` param (Phase 4) that pre-selects an insight
 * and pre-fills the title from the insight's title.
 */
export default async function NewSpecPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // Error feedback from the server action redirect
  const err = typeof sp.error === "string" ? sp.error : null;

  // Phase 4 hook: from_insight pre-selects an insight and can pre-fill the title
  const fromInsightRaw = typeof sp.from_insight === "string" ? sp.from_insight : null;
  const fromInsightId =
    fromInsightRaw != null
      ? Number.parseInt(fromInsightRaw, 10) || null
      : null;

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null) {
    return (
      <PageShell width="narrow">
        <PageHeader
          title="New spec"
          back={{ href: "/app/build/specs", label: "Specs" }}
          description="Select an active project under Settings to create specs."
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="New spec" />;
  }

  const db = await getRequestDb();

  // Load all insights for the project so the PM can pick which one(s) this spec addresses.
  // We only need id + title for the multi-select list.
  const projectInsights = await db
    .select({ id: insights.id, title: insights.title })
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(insights.title);

  // If from_insight was provided, try to find the insight title to pre-fill the spec title
  let prefillTitle = "";
  if (fromInsightId != null) {
    const match = projectInsights.find((i) => i.id === fromInsightId);
    if (match) {
      prefillTitle = match.title;
    }
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="New spec"
        back={{ href: "/app/build/specs", label: "Specs" }}
        description="Create a spec manually. You can also generate one from an insight using Create spec on the insight page."
      />

      {err === "required" ? (
        <InlineAlert variant="danger">Title is required.</InlineAlert>
      ) : null}

      <NarrowCardForm action={createSpecAction} className="mt-4">
        {/* Title */}
        <div>
          <label htmlFor="spec-title" className="form-label">
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="spec-title"
            name="title"
            required
            className="form-control"
            placeholder="e.g. Allow users to export feedback as CSV"
            defaultValue={prefillTitle}
          />
          <div className="form-text">A clear, outcome-focused title for the spec.</div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="spec-description" className="form-label">
            Description <span className="text-body-tertiary small">(optional)</span>
          </label>
          <textarea
            id="spec-description"
            name="description"
            rows={4}
            className="form-control"
            placeholder="What problem does this solve? Who is it for?"
          />
        </div>

        {/* Linked insights — the golden thread */}
        <div>
          <label className="form-label d-block">
            Linked insights <span className="text-body-tertiary small">(optional)</span>
          </label>

          {projectInsights.length === 0 ? (
            <p className="small text-body-secondary mb-0">
              No insights found for this project yet. Insights are generated automatically from
              customer feedback.
            </p>
          ) : (
            <>
              {/*
               * Multi-select: each checkbox sends name="insight_ids" with the insight id as value.
               * The server action collects all values via formData.getAll("insight_ids").
               * Using checkboxes instead of a <select multiple> avoids the "hold Ctrl" UX issue.
               */}
              <div
                className="border border-secondary-subtle rounded overflow-y-auto"
                style={{ maxHeight: "16rem" }}
              >
                <ul className="list-group list-group-flush">
                  {projectInsights.map((insight) => {
                    const isPreSelected = fromInsightId === insight.id;
                    return (
                      <li key={insight.id} className="list-group-item">
                        <div className="form-check mb-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            name="insight_ids"
                            value={insight.id}
                            id={`insight-${insight.id}`}
                            defaultChecked={isPreSelected}
                          />
                          <label
                            className="form-check-label small text-body"
                            htmlFor={`insight-${insight.id}`}
                          >
                            {insight.title}
                          </label>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="form-text">
                Select the insight(s) this spec addresses — this is the golden thread linking
                customer evidence to your build work.
              </div>
            </>
          )}
        </div>

        <FormActions variant="plain">
          <SpecSubmitButton />
          <p className="small text-body-secondary mb-0 mt-2">
            Claude will draft user stories, acceptance criteria, and success
            metrics automatically.
          </p>
        </FormActions>
      </NarrowCardForm>
    </PageShell>
  );
}
