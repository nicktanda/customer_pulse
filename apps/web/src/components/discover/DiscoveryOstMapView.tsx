import { DiscoveryOstMapGraph } from "./DiscoveryOstMapGraph.client";
import type { DiscoveryOstMapData } from "@customer-pulse/db/queries/discovery";

type Props = {
  data: DiscoveryOstMapData;
  canEdit: boolean;
};

/**
 * OST / discovery map: a single visual canvas (outcome → opportunities → solution → tests) with
 * in-diagram actions for editors — no extra cards above the diagram.
 */
export function DiscoveryOstMapView({ data, canEdit }: Props) {
  return (
    <div className="ost-map-dot-grid border border-secondary-subtle rounded-3 p-3 p-md-4 h-100">
      <DiscoveryOstMapGraph data={data} canEdit={canEdit} />
    </div>
  );
}
