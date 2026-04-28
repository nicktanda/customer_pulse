"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useCallback, type FormEvent } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { DiscoveryOstMapData } from "@customer-pulse/db/queries/discovery";
import {
  discoveryInsightStageBadgeClass,
  discoveryInsightStageShortLabel,
} from "@/lib/discovery-insight-stage";
import {
  discoveryOstMapActivityTypeLabel,
  discoveryOstMapActivityStatusLabel,
} from "@/lib/discovery-ost-map-labels";
import {
  addOstMapSolutionAction,
  addDiscoveryActivityFromMapAction,
  createOpportunityFromMapAction,
  deleteDiscoveryActivityOstMapAction,
  deleteOpportunityOstMapAction,
  removeOstMapSolutionAction,
  saveProjectOstMapRootAction,
  updateDiscoveryActivityTitleOstMapAction,
  updateInsightTitleOstMapAction,
  updateOstMapSolutionAction,
} from "@/app/app/discover/actions";

type Props = { data: DiscoveryOstMapData; canEdit: boolean };

type Rect = { left: number; top: number; w: number; h: number };

type MapModalState =
  | { kind: "goal" }
  | { kind: "addSolution"; insightId: number }
  | { kind: "editSolution"; insightId: number; index: number; text: string }
  | { kind: "addActivity"; insightId: number }
  | { kind: "editActivity"; activityId: number; insightId: number; title: string }
  | { kind: "addOpportunity" }
  | { kind: "editOpportunity"; insightId: number; title: string };

const MAP_ACTIVITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "Interview guide" },
  { value: "2", label: "Survey" },
  { value: "3", label: "Assumption map" },
  { value: "4", label: "Competitor scan" },
  { value: "5", label: "Data query" },
  { value: "6", label: "Desk research" },
  { value: "7", label: "Prototype hypothesis" },
];

/**
 * OST / discovery map: goal → opportunity columns → solution ideas → discovery activities.
 * Add/edit flows use small modals; the goal is read-only when set (s edited via pencil).
 */
export function DiscoveryOstMapGraph({ data, canEdit }: Props) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const oppRefs = useRef<(HTMLDivElement | null)[]>([]);
  const solRefs = useRef<(HTMLDivElement | null)[]>([]);
  const actRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mapModal, setMapModal] = useState<MapModalState | null>(null);

  const [svgPaths, setSvgPaths] = useState<string[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  // After any server action, close the modal and ask Next to refetch server-rendered data for this page.
  const afterAction = useCallback(() => {
    setMapModal(null);
    router.refresh();
  }, [router]);

  // Server actions want a FormData object; we build it from the modal form and await the action.
  const runFormAction = useCallback(
    async (e: FormEvent<HTMLFormElement>, action: (formData: FormData) => Promise<void>) => {
      e.preventDefault();
      await action(new FormData(e.currentTarget));
      afterAction();
    },
    [afterAction],
  );

  useLayoutEffect(() => {
    const n = data.insightGroups.length;
    oppRefs.current = new Array(n).fill(null);
    solRefs.current = new Array(n).fill(null);
    actRefs.current = new Array(n).fill(null);
  }, [data.insightGroups.length]);

  const recompute = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const wBox = wrap.getBoundingClientRect();
    setSvgSize({ w: Math.ceil(wBox.width), h: Math.ceil(wBox.height) });
    if (wBox.width < 1 || wBox.height < 1) {
      return;
    }

    const rel = (r: Rect) => ({
      x: r.left,
      y: r.top,
      w: r.w,
      h: r.h,
    });

    const getRel = (el: HTMLElement | null): Rect | null => {
      if (!el) {
        return null;
      }
      const e = el.getBoundingClientRect();
      return {
        left: e.left - wBox.left,
        top: e.top - wBox.top,
        w: e.width,
        h: e.height,
      };
    };

    const paths: string[] = [];
    const outR = getRel(outcomeRef.current);
    if (!outR) {
      setSvgPaths([]);
      return;
    }
    const o = rel(outR);
    const outCx = o.x + o.w / 2;
    const outBy = o.y + o.h;

    const n = data.insightGroups.length;
    if (n === 0) {
      setSvgPaths([]);
      return;
    }

    let minOppTop = Number.POSITIVE_INFINITY;
    for (let j = 0; j < n; j++) {
      const r = getRel(oppRefs.current[j]);
      if (r) {
        minOppTop = Math.min(minOppTop, r.top);
      }
    }
    if (!Number.isFinite(minOppTop)) {
      setSvgPaths([]);
      return;
    }
    const gap = minOppTop - outBy;
    const yBus = gap > 4 ? outBy + Math.min(36, Math.max(12, gap * 0.42)) : outBy + 2;

    for (let i = 0; i < n; i++) {
      const oppE = oppRefs.current[i];
      const solE = solRefs.current[i];
      const actE = actRefs.current[i];
      const oppR = getRel(oppE);
      if (!oppR) {
        continue;
      }
      const op = rel(oppR);
      const oppCx = op.x + op.w / 2;
      const oppTop = op.y;
      paths.push(orthogonalPath(outCx, outBy, outCx, yBus, oppCx, yBus, oppCx, oppTop));

      if (solE) {
        const solR = getRel(solE);
        if (solR) {
          const s = rel(solR);
          const sCx = s.x + s.w / 2;
          const sTy = s.y;
          const ob = op.y + op.h;
          const yMid = ob + (sTy - ob) * 0.5;
          paths.push(orthogonalPath(oppCx, ob, oppCx, yMid, sCx, yMid, sCx, sTy));
        }
      }
      if (actE) {
        const ar = getRel(actE);
        if (ar && solE) {
          const sR = getRel(solE);
          if (sR) {
            const s = rel(sR);
            const sCx = s.x + s.w / 2;
            const sb = s.y + s.h;
            const a = rel(ar);
            const aCx = a.x + a.w / 2;
            const aTy = a.y;
            const yMid2 = sb + (aTy - sb) * 0.5;
            paths.push(orthogonalPath(sCx, sb, sCx, yMid2, aCx, yMid2, aCx, aTy));
          }
        }
      }
    }
    setSvgPaths(paths);
  }, [data]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => recompute());
    });
    ro.observe(wrap);
    requestAnimationFrame(() => {
      recompute();
      requestAnimationFrame(() => recompute());
    });
    return () => ro.disconnect();
  }, [recompute]);

  const rootText = data.root.text?.trim() || "";
  const hasRootContent = rootText.length > 0;
  const outcomeLabel = hasRootContent ? rootText : `Project: ${data.projectName}`;

  return (
    <div ref={wrapRef} className="ost-map-canvas position-relative w-100 py-3">
      {svgSize.w > 0 && svgSize.h > 0 ? (
        <svg
          className="position-absolute start-0 top-0"
          width={svgSize.w}
          height={svgSize.h}
          style={{ zIndex: 0, pointerEvents: "none", overflow: "visible" }}
          aria-hidden
        >
          {svgPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              className="ost-map-connector"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      ) : null}

      <OstMapModals
        mapModal={mapModal}
        onHide={() => setMapModal(null)}
        rootText={rootText}
        runFormAction={runFormAction}
        projectName={data.projectName}
      />

      <div
        className="position-relative d-flex flex-column align-items-center gap-4 gap-md-5"
        style={{ zIndex: 1 }}
      >
        <div className="w-100 d-flex flex-column align-items-center">
          <p className="text-uppercase small text-body-tertiary mb-2" style={{ letterSpacing: "0.06em" }}>
            Desired outcome
          </p>
          <div
            ref={outcomeRef}
            className="ost-node-outcome rounded-3 text-center shadow-sm"
            style={{ minWidth: "min(32rem, 100%)", maxWidth: "100%" }}
          >
            {canEdit && hasRootContent ? (
              <div className="d-flex align-items-start justify-content-between gap-2 text-start w-100">
                <p className="fw-semibold text-body-emphasis mb-0 flex-grow-1" style={{ lineHeight: 1.55 }}>
                  {outcomeLabel}
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-link p-1 text-body-secondary"
                  onClick={() => setMapModal({ kind: "goal" })}
                  aria-label="Edit goal"
                  title="Edit goal"
                >
                  <Pencil size={16} />
                </button>
              </div>
            ) : canEdit && !hasRootContent ? (
              <div className="d-flex flex-column align-items-stretch text-start w-100">
                <p className="small text-body-tertiary mb-2">Describe the outcome you want (one line is enough).</p>
                <Button variant="outline-secondary" size="sm" onClick={() => setMapModal({ kind: "goal" })}>
                  <span className="d-inline-flex align-items-center gap-1">
                    <Plus size={16} aria-hidden />
                    Set goal
                  </span>
                </Button>
              </div>
            ) : (
              <p className="fw-semibold text-body-emphasis mb-0 px-1 text-center w-100" style={{ lineHeight: 1.55 }}>
                {outcomeLabel}
              </p>
            )}
          </div>
        </div>

        {data.insightGroups.length > 0 ? (
          <>
            <p
              className="text-uppercase small text-body-tertiary mb-0 align-self-center"
              style={{ letterSpacing: "0.06em" }}
            >
              Opportunity
            </p>
            {/* align-items-start: each branch only as tall as its own content — not the tallest sibling */}
            <div
              className="d-flex flex-wrap justify-content-center align-items-start gap-3 gap-md-4 w-100"
              style={{ maxWidth: "100%" }}
            >
              {data.insightGroups.map((ig, i) => (
                <div
                  key={ig.insightId}
                  className="d-flex flex-column align-items-stretch ost-map-opp-column"
                  style={{ flex: "1 1 12rem", maxWidth: "22rem" }}
                >
                  <div
                    ref={(el) => {
                      oppRefs.current[i] = el;
                    }}
                    className="ost-node-opportunity rounded-3 text-center shadow-sm d-flex flex-column w-100"
                  >
                    <div className="d-flex align-items-start justify-content-between gap-1 text-start w-100">
                      <Link
                        href={`/app/discover/insights/${ig.insightId}`}
                        className="ost-map-opp-title text-decoration-none fw-semibold text-body-emphasis flex-grow-1"
                      >
                        {ig.insightTitle}
                      </Link>
                      {canEdit ? (
                        <div className="ost-map-icon-row">
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-1 text-body-secondary"
                            aria-label="Rename opportunity"
                            title="Rename"
                            onClick={() =>
                              setMapModal({ kind: "editOpportunity", insightId: ig.insightId, title: ig.insightTitle })
                            }
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-1 text-danger"
                            aria-label="Delete opportunity"
                            title="Delete opportunity"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "Delete this opportunity and all discovery activities, Learn links, and map data for it? This cannot be undone.",
                                )
                              ) {
                                return;
                              }
                              const fd = new FormData();
                              fd.set("insight_id", String(ig.insightId));
                              void deleteOpportunityOstMapAction(fd).then(() => afterAction());
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {ig.teamName ? (
                      <p className="small text-body-secondary mb-0 text-start" style={{ lineHeight: 1.45 }}>
                        Team: {ig.teamName}
                      </p>
                    ) : null}
                    <span
                      className={`badge ${discoveryInsightStageBadgeClass(ig.insightDiscoveryStage)} ost-map-opp-badge align-self-start`}
                      style={{ fontSize: "0.65rem" }}
                    >
                      {discoveryInsightStageShortLabel(ig.insightDiscoveryStage)}
                    </span>
                  </div>

                  <div
                    ref={(el) => {
                      solRefs.current[i] = el;
                    }}
                    className="ost-node-solution rounded-3 text-start small text-body-secondary shadow-sm d-flex flex-column"
                  >
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                      <span
                        className="text-uppercase text-body-tertiary d-block"
                        style={{ fontSize: "0.65rem", letterSpacing: "0.08em" }}
                      >
                        Solution
                      </span>
                      {canEdit ? (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="py-0 px-2"
                          onClick={() => setMapModal({ kind: "addSolution", insightId: ig.insightId })}
                        >
                          <span className="d-inline-flex align-items-center gap-1">
                            <Plus size={14} aria-hidden />
                            Add
                          </span>
                        </Button>
                      ) : null}
                    </div>
                    {ig.solutionOptions.length > 0 ? (
                      <ol className="ost-map-solution-list--stack w-100 ps-0 mb-0">
                        {ig.solutionOptions.map((line, si) => (
                          <li key={`${ig.insightId}-sol-${si}`} className="ost-map-solution-item">
                            <span className="ost-map-solution-idx" aria-hidden>
                              {si + 1}.
                            </span>
                            <div className="ost-map-solution-line text-body text-break">{line}</div>
                            {canEdit ? (
                              <div className="ost-map-icon-row">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link p-1 text-body-secondary"
                                  aria-label="Edit solution"
                                  title="Edit"
                                  onClick={() =>
                                    setMapModal({
                                      kind: "editSolution",
                                      insightId: ig.insightId,
                                      index: si,
                                      text: line,
                                    })
                                  }
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link p-1 text-danger"
                                  aria-label="Remove solution"
                                  title="Remove"
                                  onClick={() => {
                                    if (!window.confirm("Remove this solution line?")) {
                                      return;
                                    }
                                    const fd = new FormData();
                                    fd.set("insight_id", String(ig.insightId));
                                    fd.set("solution_index", String(si));
                                    void removeOstMapSolutionAction(fd).then(() => afterAction());
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-body-tertiary small mb-0" style={{ lineHeight: 1.5 }}>
                        {canEdit
                          ? "Add solution ideas to explore how you could address this need."
                          : "No solution ideas on the OST map yet."}
                      </p>
                    )}
                  </div>

                  <div
                    ref={(el) => {
                      actRefs.current[i] = el;
                    }}
                    className="d-flex flex-column align-items-stretch ost-map-assumption-block mt-0"
                  >
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <span
                        className="text-uppercase text-center text-body-tertiary flex-grow-1"
                        style={{ fontSize: "0.65rem", letterSpacing: "0.08em" }}
                      >
                        Assumption test
                      </span>
                      {canEdit ? (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="py-0 px-2 flex-shrink-0"
                          onClick={() => setMapModal({ kind: "addActivity", insightId: ig.insightId })}
                        >
                          <span className="d-inline-flex align-items-center gap-1">
                            <Plus size={14} aria-hidden />
                            Add
                          </span>
                        </Button>
                      ) : null}
                    </div>
                    {ig.activities.map((a) => (
                      <div
                        key={a.id}
                        className="ost-node-test rounded-2 text-start shadow-sm text-body-secondary w-100"
                      >
                        <div className="d-flex align-items-start justify-content-between gap-1">
                          <Link
                            href={`/app/discover/activities/${a.id}`}
                            className="ost-map-test-line text-decoration-none fw-medium text-body-emphasis text-break flex-grow-1"
                          >
                            {a.title}
                          </Link>
                          {canEdit ? (
                            <div className="ost-map-icon-row">
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-1 text-body-secondary"
                                aria-label="Rename activity"
                                title="Edit title"
                                onClick={() =>
                                  setMapModal({
                                    kind: "editActivity",
                                    activityId: a.id,
                                    insightId: ig.insightId,
                                    title: a.title,
                                  })
                                }
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-1 text-danger"
                                aria-label="Delete activity"
                                title="Delete"
                                onClick={() => {
                                  if (!window.confirm("Delete this experiment? The board and lists will update.")) {
                                    return;
                                  }
                                  const fd = new FormData();
                                  fd.set("activity_id", String(a.id));
                                  fd.set("insight_id", String(ig.insightId));
                                  void deleteDiscoveryActivityOstMapAction(fd).then(() => afterAction());
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="ost-map-test-line text-body-tertiary" style={{ fontSize: "0.78rem" }}>
                          {discoveryOstMapActivityTypeLabel(a.activityType)} ·{" "}
                          {discoveryOstMapActivityStatusLabel(a.status)}
                        </div>
                        <div className="ost-map-test-line text-body-tertiary" style={{ fontSize: "0.75rem" }}>
                          {a.ownerDisplayLabel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : !canEdit ? (
          <p
            className="small text-body-secondary text-center mb-0 px-2"
            style={{ maxWidth: "32rem", lineHeight: 1.5 }}
          >
            No opportunities with discovery work yet. Editors can add them on this OST map; you can also browse{" "}
            <Link href="/app/discover/workspace" className="link-primary">
              workspace
            </Link>{" "}
            or{" "}
            <Link href="/app/learn/insights" className="link-primary">
              Learn
            </Link>
            .
          </p>
        ) : null}

        {canEdit ? (
          <div className="w-100 d-flex flex-column align-items-center">
            <p
              className="text-uppercase small text-body-tertiary mb-2"
              style={{ letterSpacing: "0.06em" }}
            >
              {data.insightGroups.length === 0 ? "Start here" : "Add another"}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setMapModal({ kind: "addOpportunity" })}
            >
              <span className="d-inline-flex align-items-center gap-1">
                <Plus size={16} aria-hidden />
                Add opportunity
              </span>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type OstMapModalsProps = {
  mapModal: MapModalState | null;
  onHide: () => void;
  rootText: string;
  runFormAction: (e: FormEvent<HTMLFormElement>, action: (fd: FormData) => Promise<void>) => Promise<void>;
  projectName: string;
};

/**
 * Renders the discovery-map modals. Split out to keep the main graph’s connector logic readable.
 */
function OstMapModals({ mapModal, onHide, rootText, runFormAction, projectName }: OstMapModalsProps) {
  return (
    <>
      <Modal show={mapModal?.kind === "goal"} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Desired outcome</Modal.Title>
        </Modal.Header>
        <form
          onSubmit={(e) => runFormAction(e, saveProjectOstMapRootAction)}
        >
          <Modal.Body>
            <Form.Label htmlFor="modal-ost-root" className="small text-body-secondary">
              One line for the goal (e.g. what success looks like for your team).
            </Form.Label>
            <Form.Control
              id="modal-ost-root"
              name="ost_root_text"
              type="text"
              className="mt-1"
              defaultValue={rootText}
              placeholder={`e.g. make ${projectName} invaluable for PMs`}
              maxLength={500}
              autoFocus
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={onHide} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={mapModal?.kind === "addSolution"} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Add solution</Modal.Title>
        </Modal.Header>
        <form onSubmit={(e) => runFormAction(e, addOstMapSolutionAction)}>
          <input
            type="hidden"
            name="insight_id"
            value={mapModal?.kind === "addSolution" ? String(mapModal.insightId) : ""}
          />
          <Modal.Body>
            <Form.Label htmlFor="modal-solution-line" className="small text-body-secondary">
              How might you address this need?
            </Form.Label>
            <Form.Control
              id="modal-solution-line"
              as="textarea"
              rows={3}
              name="solution_line"
              className="mt-1"
              placeholder="One approach or bet…"
              maxLength={500}
              required
              autoFocus
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={mapModal?.kind === "editSolution"} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Edit solution</Modal.Title>
        </Modal.Header>
        <form onSubmit={(e) => runFormAction(e, updateOstMapSolutionAction)}>
          {mapModal?.kind === "editSolution" ? (
            <input type="hidden" name="insight_id" value={String(mapModal.insightId)} />
          ) : null}
          {mapModal?.kind === "editSolution" ? (
            <input type="hidden" name="solution_index" value={String(mapModal.index)} />
          ) : null}
          <Modal.Body>
            <Form.Label htmlFor="modal-edit-solution" className="small text-body-secondary">
              Text
            </Form.Label>
            <Form.Control
              id="modal-edit-solution"
              as="textarea"
              rows={3}
              name="solution_line"
              className="mt-1"
              key={mapModal?.kind === "editSolution" ? mapModal.text : "x"}
              defaultValue={mapModal?.kind === "editSolution" ? mapModal.text : ""}
              maxLength={500}
              required
              autoFocus
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={mapModal?.kind === "addActivity"} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Add experiment</Modal.Title>
        </Modal.Header>
        <form onSubmit={(e) => runFormAction(e, addDiscoveryActivityFromMapAction)}>
          <input
            type="hidden"
            name="insight_id"
            value={mapModal?.kind === "addActivity" ? String(mapModal.insightId) : ""}
          />
          <Modal.Body>
            <Form.Label htmlFor="modal-act-title" className="small text-body-secondary">
              Title
            </Form.Label>
            <Form.Control
              id="modal-act-title"
              name="activity_title"
              className="mt-1 mb-2"
              placeholder="Optional (defaults to the activity type name)"
              maxLength={255}
            />
            <Form.Label htmlFor="modal-act-type" className="small text-body-secondary">
              Type
            </Form.Label>
            <Form.Select id="modal-act-type" name="activity_type" className="mt-1" defaultValue="1">
              {MAP_ACTIVITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={mapModal?.kind === "editActivity"} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Rename experiment</Modal.Title>
        </Modal.Header>
        <form onSubmit={(e) => runFormAction(e, updateDiscoveryActivityTitleOstMapAction)}>
          {mapModal?.kind === "editActivity" ? (
            <>
              <input type="hidden" name="activity_id" value={String(mapModal.activityId)} />
              <input type="hidden" name="insight_id" value={String(mapModal.insightId)} />
            </>
          ) : null}
          <Modal.Body>
            <Form.Label htmlFor="modal-edit-act" className="small text-body-secondary">
              Title
            </Form.Label>
            <Form.Control
              id="modal-edit-act"
              name="activity_title"
              className="mt-1"
              key={mapModal?.kind === "editActivity" ? mapModal.title : "a"}
              defaultValue={mapModal?.kind === "editActivity" ? mapModal.title : ""}
              maxLength={255}
              required
              autoFocus
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={mapModal?.kind === "addOpportunity"} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Add opportunity</Modal.Title>
        </Modal.Header>
        <form onSubmit={(e) => runFormAction(e, createOpportunityFromMapAction)}>
          <Modal.Body>
            <Form.Label htmlFor="modal-opp" className="small text-body-secondary">
              Title
            </Form.Label>
            <Form.Control
              id="modal-opp"
              name="opportunity_title"
              className="mt-1"
              placeholder="e.g. Export failures on large accounts"
              maxLength={255}
              minLength={1}
              required
              autoFocus
            />
            <p className="small text-body-tertiary mt-2 mb-0">
              Creates a draft “First experiment” so this column shows on the board and in discovery.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={mapModal?.kind === "editOpportunity"} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Rename opportunity</Modal.Title>
        </Modal.Header>
        <form onSubmit={(e) => runFormAction(e, updateInsightTitleOstMapAction)}>
          {mapModal?.kind === "editOpportunity" ? (
            <input type="hidden" name="insight_id" value={String(mapModal.insightId)} />
          ) : null}
          <Modal.Body>
            <Form.Label htmlFor="modal-edit-opp" className="small text-body-secondary">
              Title
            </Form.Label>
            <Form.Control
              id="modal-edit-opp"
              name="insight_title"
              className="mt-1"
              key={mapModal?.kind === "editOpportunity" ? mapModal.title : "o"}
              defaultValue={mapModal?.kind === "editOpportunity" ? mapModal.title : ""}
              maxLength={255}
              required
              autoFocus
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
}

function orthogonalPath(
  sx: number,
  sy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ex: number,
  ey: number,
): string {
  return `M ${sx} ${sy} L ${x1} ${y1} L ${x2} ${y2} L ${ex} ${ey}`;
}
