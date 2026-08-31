import Link from "next/link";
import type { DiscoveryOstMapData } from "@customer-pulse/db/queries/discovery";
import { DiscoveryOstMapView } from "./DiscoveryOstMapView";
import { OstSeedButton } from "./OstSeedButton";

type Props = {
  data: DiscoveryOstMapData;
  canEdit: boolean;
  projectName: string;
  /**
   * `page` = dedicated route (`/app/discover/map`) with room to scroll. `embed` = section on the
   * Discover overview that reuses the same canvas plus a link to the full page.
   */
  mode: "page" | "embed";
};

/**
 * Renders the OST (outcome–solution tree) map either as a full app page or as an embedded
 * block on the Discover hub. The graph and data are identical in both cases.
 */
export function DiscoverOstMapPanel({ data, canEdit, projectName, mode }: Props) {
  if (mode === "page") {
    return (
      <div className="d-flex flex-column flex-grow-1 min-h-0">
        <div className="d-flex align-items-baseline gap-3 flex-wrap px-2 py-2 border-bottom border-secondary-subtle">
          <Link href="/app/discover" className="btn btn-sm btn-link text-decoration-none text-body px-0">
            ← Discover
          </Link>
          <h1 className="h6 mb-0 text-body text-truncate flex-grow-1" title={projectName}>
            OST Map
            {projectName ? <span className="text-body-tertiary fw-normal"> · {projectName}</span> : null}
          </h1>
          {canEdit ? <OstSeedButton /> : null}
        </div>
        <div className="flex-grow-1 p-2 p-md-3 overflow-auto min-h-0">
          <DiscoveryOstMapView data={data} canEdit={canEdit} />
        </div>
      </div>
    );
  }

  // Embedded on the hub: same diagram as /app/discover/map, with a clear link to the full page.
  return (
    <section
      id="ost-map-embed"
      className="scroll-target-ost-map-embed"
      aria-labelledby="ost-map-embed-heading"
    >
      <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-2">
        <h2 id="ost-map-embed-heading" className="h5 text-body-emphasis mb-0">
          OST Map — goal, opportunities, solutions, experiments
        </h2>
        <div className="d-flex flex-wrap align-items-baseline gap-2">
          <p className="small text-body-tertiary mb-0">
            Project: <span className="text-body-secondary">{projectName}</span>
          </p>
          <Link href="/app/discover/map" className="small text-decoration-none">
            Open full page
            <span className="visually-hidden"> (OST Map)</span>
          </Link>
        </div>
      </div>
      <p className="text-body-secondary small mb-3" style={{ maxWidth: "48rem" }}>
        Outcome, opportunities with solution ideas, and experiments (activities) that validate
        assumptions — identical to the <Link href="/app/discover/map" className="text-decoration-none">full-page OST Map</Link>. Add opportunities here; they also show on the board.
      </p>
      <div className="min-vh-0">
        <DiscoveryOstMapView data={data} canEdit={canEdit} />
      </div>
    </section>
  );
}
