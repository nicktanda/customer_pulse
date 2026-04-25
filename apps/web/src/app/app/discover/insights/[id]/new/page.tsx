import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PageHeader, PageShell, NarrowCardForm, FormActions } from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { createDiscoveryActivityAction } from "../../../actions";

/**
 * Maps activity type integer to a label and description shown in the form.
 * Integers match DiscoveryActivityType enum in packages/db/src/enums.ts.
 */
function activityTypeInfo(type: number): { label: string; icon: string; description: string } {
  switch (type) {
    case 1:
      return {
        label: "Interview guide",
        icon: "💬",
        description: "Claude will draft 6 open-ended interview questions tailored to this insight.",
      };
    case 2:
      return {
        label: "Survey",
        icon: "📋",
        description: "Claude will draft a 5-question survey you can send to affected users.",
      };
    case 3:
      return {
        label: "Assumption map",
        icon: "🗺",
        description: "Claude will surface the hidden assumptions behind this insight and suggest how to test each.",
      };
    case 4:
      return {
        label: "Competitor scan",
        icon: "🔭",
        description: "Claude will suggest 3 competitors to research and what to look for about how they handle this problem.",
      };
    case 5:
      return {
        label: "Data query",
        icon: "📊",
        description: "Claude will suggest 3 data questions or metrics to quantitatively back up this insight.",
      };
    case 6:
      return {
        label: "Desk research",
        icon: "📚",
        description: "A free-form notes space for secondary research — articles, studies, internal docs. No AI draft.",
      };
    case 7:
      return {
        label: "Prototype hypothesis",
        icon: "💡",
        description: "Claude will draft a testable hypothesis and two prototype test ideas for this insight.",
      };
    default:
      return {
        label: "Discovery activity",
        icon: "📝",
        description: "A new discovery activity for this insight.",
      };
  }
}

/**
 * New discovery activity form.
 * The activity type comes from the `?type=N` query param set by the dropdown on the insight view.
 * Submits to createDiscoveryActivityAction which creates the row and redirects to the detail page.
 */
export default async function NewDiscoveryActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id: idStr } = await params;
  const { type: typeStr } = await searchParams;

  const insightId = Number.parseInt(idStr, 10);
  // Default to interview guide (type=1) if no valid type is passed
  const activityType = Number.parseInt(typeStr ?? "1", 10);

  if (!Number.isFinite(insightId)) {
    notFound();
  }

  const validTypes = [1, 2, 3, 4, 5, 6, 7];
  if (!validTypes.includes(activityType)) {
    redirect(`/app/discover/insights/${insightId}`);
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect(`/app/discover/insights/${insightId}`);
  }

  const db = await getRequestDb();
  const [insight] = await db
    .select({ id: insights.id, title: insights.title })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);

  if (!insight) {
    notFound();
  }

  const info = activityTypeInfo(activityType);

  return (
    <PageShell width="narrow">
      <PageHeader
        title={`New ${info.label}`}
        description={`For insight: ${insight.title}`}
        back={{ href: `/app/discover/insights/${insightId}`, label: "Back to insight" }}
      />

      <NarrowCardForm action={createDiscoveryActivityAction}>
        {/* Hidden fields — passed to the server action */}
        <input type="hidden" name="insight_id" value={insightId} />
        <input type="hidden" name="activity_type" value={activityType} />

        {/* Activity type display — icon + label + description */}
        <div
          className="d-flex align-items-start gap-3 p-3 rounded mb-1"
          style={{ background: "rgba(var(--bs-primary-rgb), 0.06)", border: "1px solid rgba(var(--bs-primary-rgb), 0.12)" }}
        >
          <span style={{ fontSize: "1.5rem", flexShrink: 0 }} aria-hidden="true">
            {info.icon}
          </span>
          <div>
            <p className="fw-semibold mb-1 small text-body-emphasis">{info.label}</p>
            <p className="small text-body-secondary mb-0">{info.description}</p>
          </div>
        </div>

        {/* Optional custom title */}
        <div className="mb-3">
          <label htmlFor="title" className="form-label fw-medium">
            Title <span className="text-body-secondary fw-normal">(optional)</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            className="form-control"
            placeholder={info.label}
            maxLength={255}
          />
          <div className="form-text">Leave blank to use the default name for this activity type.</div>
        </div>

        <FormActions variant="plain">
          <button type="submit" className="btn btn-primary">
            Create activity
          </button>
          <a href={`/app/discover/insights/${insightId}`} className="btn btn-outline-secondary">
            Cancel
          </a>
        </FormActions>
      </NarrowCardForm>
    </PageShell>
  );
}
