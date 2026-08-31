import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { draftInsightFromFeedbackAction } from "../actions";
import { NewInsightForm } from "./NewInsightForm";

/**
 * Item 7: manual insight authoring with draft-on-open from selected feedback.
 * Pass feedback IDs as `?from_feedback=1,2,3` to seed the AI draft.
 */
export default async function NewInsightPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const fromFeedbackRaw = typeof sp.from_feedback === "string" ? sp.from_feedback : null;
  const fromFeedbackIds = fromFeedbackRaw
    ? fromFeedbackRaw
        .split(",")
        .map((s) => Number.parseInt(s, 10))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null) {
    redirect("/app/projects");
  }
  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="New insight" />;
  }

  // Draft on load — same idea as discovery activity drafting. Best-effort: if there are no
  // feedback IDs or AI is unavailable, the form just renders empty.
  let initialTitle = "";
  let initialDescription = "";
  let initialConfidence: number | null = null;
  if (fromFeedbackIds.length > 0) {
    const draft = await draftInsightFromFeedbackAction(fromFeedbackIds);
    if (draft.ok) {
      initialTitle = draft.title ?? "";
      initialDescription = draft.description ?? "";
      initialConfidence = draft.confidence ?? null;
    }
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="New insight"
        back={{ href: "/app/learn/insights", label: "Insights" }}
        description={
          fromFeedbackIds.length > 0
            ? `Drafting from ${fromFeedbackIds.length} feedback ${fromFeedbackIds.length === 1 ? "item" : "items"}.`
            : "Synthesise a customer insight by hand or seed it from selected feedback."
        }
      />
      <NewInsightForm
        initialTitle={initialTitle}
        initialDescription={initialDescription}
        initialConfidence={initialConfidence}
        seedFeedbackIds={fromFeedbackIds}
      />
    </PageShell>
  );
}
