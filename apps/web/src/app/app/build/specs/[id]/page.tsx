import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { getSpecById } from "@customer-pulse/db/queries/specs";
import { PageHeader, PageShell } from "@/components/ui";
import { formatAppDateTime } from "@/lib/format-app-date";

/**
 * Spec detail page — shows all sections of a spec including AI-generated
 * user stories, acceptance criteria, success metrics, out-of-scope items,
 * and risks.
 *
 * Sections with empty arrays are hidden entirely to avoid blank headings.
 * The "AI Drafted" badge only appears when aiGenerated = true.
 */
export default async function SpecShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);

  // Validate the ID is a real number before hitting the DB
  if (!Number.isFinite(id)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/build/specs");
  }

  const db = await getRequestDb();
  const spec = await getSpecById(db, id, projectId);

  if (!spec) {
    notFound();
  }

  // Map integer status to a human-readable label and Bootstrap badge colour
  const statusInfo = specStatusDisplay(spec.status);

  return (
    <PageShell width="narrow">
      <PageHeader
        title={spec.title}
        back={{ href: "/app/build/specs", label: "Specs" }}
        description={formatAppDateTime(spec.createdAt)}
      />

      {/* Status + AI badges */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <span className={`badge ${statusInfo.badgeClass}`}>
          {statusInfo.label}
        </span>
        {spec.aiGenerated && (
          <span
            className="badge text-bg-warning"
            title="User stories, acceptance criteria, and success metrics were drafted by Claude"
          >
            AI Drafted
          </span>
        )}
      </div>

      {/* Problem statement / description */}
      {spec.description && (
        <div className="mb-4">
          <p className="lead text-body-secondary" style={{ fontSize: "1rem" }}>
            {spec.description}
          </p>
        </div>
      )}

      {/* User stories */}
      {spec.userStories.length > 0 && (
        <SpecSection title="User stories">
          <ol className="mb-0 ps-3">
            {spec.userStories.map((story, i) => (
              <li key={i} className="mb-2 small text-body">
                {story}
              </li>
            ))}
          </ol>
        </SpecSection>
      )}

      {/* Acceptance criteria */}
      {spec.acceptanceCriteria.length > 0 && (
        <SpecSection title="Acceptance criteria">
          <ul className="mb-0 ps-3">
            {spec.acceptanceCriteria.map((criterion, i) => (
              <li key={i} className="mb-2 small text-body">
                {criterion}
              </li>
            ))}
          </ul>
        </SpecSection>
      )}

      {/* Success metrics */}
      {spec.successMetrics.length > 0 && (
        <SpecSection title="Success metrics">
          <ul className="list-unstyled mb-0">
            {spec.successMetrics.map((metric, i) => (
              <li key={i} className="mb-2 small text-body d-flex gap-2">
                {/* Chart upward emoji prefix so it scans as "metric" quickly */}
                <span aria-hidden="true">📈</span>
                <span>{metric}</span>
              </li>
            ))}
          </ul>
        </SpecSection>
      )}

      {/* Out of scope */}
      {spec.outOfScope.length > 0 && (
        <SpecSection title="Out of scope">
          <ul className="list-unstyled mb-0">
            {spec.outOfScope.map((item, i) => (
              <li key={i} className="mb-2 small text-body d-flex gap-2">
                {/* Cross prefix — makes it visually clear these are exclusions */}
                <span aria-hidden="true" className="text-danger-emphasis">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SpecSection>
      )}

      {/* Risks */}
      {spec.risks.length > 0 && (
        <SpecSection title="Risks & edge cases">
          <ul className="list-unstyled mb-0">
            {spec.risks.map((risk, i) => (
              <li key={i} className="mb-2 small text-body d-flex gap-2">
                <span aria-hidden="true">⚠️</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </SpecSection>
      )}

      {/* Linked insights — the golden thread back to customer evidence */}
      {spec.linkedInsights.length > 0 && (
        <SpecSection title="Linked insights">
          <div className="d-flex flex-wrap gap-2">
            {spec.linkedInsights.map((insight) => (
              <Link
                key={insight.id}
                href={`/app/learn/insights/${insight.id}`}
                className="badge text-bg-secondary text-decoration-none fw-normal"
              >
                {insight.title}
              </Link>
            ))}
          </div>
          <p className="small text-body-tertiary mt-2 mb-0">
            These insights are the customer evidence this spec was built from.
          </p>
        </SpecSection>
      )}

      {/* Empty spec fallback — shown when AI failed and PM hasn't filled in anything yet */}
      {spec.userStories.length === 0 &&
        spec.acceptanceCriteria.length === 0 &&
        spec.successMetrics.length === 0 && (
        <div className="alert alert-secondary">
          <strong>No spec content yet.</strong> This spec was saved without AI-generated sections.
          Editing support is coming in the next session — for now you can{" "}
          <Link href={`/app/build/specs/new?from_insight=${spec.linkedInsights[0]?.id ?? ""}`}>
            create a new spec from an insight
          </Link>{" "}
          to get a fully drafted version.
        </div>
      )}
    </PageShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Small reusable section wrapper — heading + content card.
 * Keeps the detail page layout consistent without a full component file.
 */
function SpecSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h6 className="text-body-tertiary text-uppercase small fw-semibold mb-2 ls-wide">
        {title}
      </h6>
      <div className="card card-body bg-body-tertiary border-0 py-3">
        {children}
      </div>
    </div>
  );
}

/**
 * Maps a SpecStatus integer to a label and Bootstrap badge CSS class.
 * Keeps status display logic in one place so it's easy to update.
 */
function specStatusDisplay(status: number): { label: string; badgeClass: string } {
  switch (status) {
    case 0: return { label: "Backlog",      badgeClass: "text-bg-secondary" };
    case 1: return { label: "Drafting",     badgeClass: "text-bg-info"      };
    case 2: return { label: "In review",    badgeClass: "text-bg-warning"   };
    case 3: return { label: "Ready",        badgeClass: "text-bg-primary"   };
    case 4: return { label: "In progress",  badgeClass: "text-bg-primary"   };
    case 5: return { label: "Shipped",      badgeClass: "text-bg-success"   };
    default: return { label: "Unknown",     badgeClass: "text-bg-secondary" };
  }
}
