"use client";

import { useState, useTransition } from "react";
import { Modal, Button } from "react-bootstrap";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfidenceBadge } from "@/components/ai/AiSuggestion";
import {
  createOpportunityFromMapAction,
  seedOpportunitiesFromInsightsAction,
} from "@/app/app/discover/actions";

/**
 * Item 3: button on the OST map that asks Claude to cluster the project's insights into 3-6
 * opportunities, then lets the user accept any subset to add to the map. Each accepted opportunity
 * runs through the existing createOpportunityFromMapAction.
 */
export function OstSeedButton() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();
  const [opportunities, setOpportunities] = useState<{ title: string; insightIds: number[] }[] | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function open() {
    setError(null);
    setOpportunities(null);
    setShow(true);
    startTransition(async () => {
      const res = await seedOpportunitiesFromInsightsAction();
      if (!res.ok) {
        setError(
          res.error === "not_enough_insights"
            ? "Need at least 3 insights to cluster. Run the worker pipeline first."
            : "Could not generate suggestions.",
        );
        return;
      }
      setOpportunities(res.opportunities ?? []);
      setConfidence(res.confidence ?? null);
      setSelected(new Set());
    });
  }

  function toggle(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function applySelection() {
    if (!opportunities) return;
    for (const idx of selected) {
      const opp = opportunities[idx];
      if (!opp) continue;
      const fd = new FormData();
      fd.set("opportunity_title", opp.title);
      try {
        await createOpportunityFromMapAction(fd);
      } catch (err) {
        console.error(`[ost-seed] Failed to add opportunity: ${err instanceof Error ? err.message : err}`);
      }
    }
    setShow(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        onClick={open}
        className="d-inline-flex align-items-center gap-1"
      >
        <Sparkles size={14} aria-hidden="true" />
        Suggest opportunities from insights
      </Button>

      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="h6 d-flex align-items-center gap-2">
            Suggested opportunities
            {confidence != null ? <ConfidenceBadge score={confidence} hideLabel /> : null}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pending ? (
            <p className="small text-body-secondary mb-0">Clustering insights…</p>
          ) : error ? (
            <p className="small text-danger mb-0">{error}</p>
          ) : opportunities && opportunities.length > 0 ? (
            <ul className="list-unstyled mb-0">
              {opportunities.map((opp, i) => (
                <li key={i} className="border border-secondary-subtle rounded-2 p-2 mb-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`ost-seed-${i}`}
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                    />
                    <label className="form-check-label small text-body" htmlFor={`ost-seed-${i}`}>
                      <span className="fw-medium text-body-emphasis d-block">{opp.title}</span>
                      <span className="text-body-tertiary">
                        From insight ids:{" "}
                        {opp.insightIds.length > 0 ? opp.insightIds.join(", ") : "—"}
                      </span>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small text-body-secondary mb-0">No suggestions returned.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={applySelection}
            disabled={selected.size === 0 || pending}
          >
            Add {selected.size} {selected.size === 1 ? "opportunity" : "opportunities"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
