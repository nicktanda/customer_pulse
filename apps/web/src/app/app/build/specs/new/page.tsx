import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import {
  InlineAlert,
  PageHeader,
  PageShell,
  ProjectAccessDenied,
} from "@/components/ui";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { insights } from "@customer-pulse/db/client";
import { SpecFormClient } from "./SpecFormClient";

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

      <SpecFormClient
        projectInsights={projectInsights}
        prefillTitle={prefillTitle}
        fromInsightId={fromInsightId}
      />
    </PageShell>
  );
}
