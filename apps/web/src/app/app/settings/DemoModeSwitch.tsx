"use client";

import { useEffect, useState, useTransition } from "react";
import { setDemoModeAction } from "./demo-seed-actions";

type Props = {
  /** Whether demo feedback rows are already present for this project (from the server). */
  initiallyOn: boolean;
  /**
   * When false, the switch is visible but disabled — `ALLOW_DEMO_DATA_SEED` is not set on the server.
   * The server action still refuses to run without that env var; this only improves discoverability in the UI.
   */
  actionsEnabled: boolean;
};

/**
 * Bootstrap form-switch wired to a server action: ON fills the project with tagged synthetic data,
 * OFF removes only those demo-tagged rows. Next.js redirects after the action so the page reloads
 * with fresh DB state and any success banner in the URL.
 */
export function DemoModeSwitch({ initiallyOn, actionsEnabled }: Props) {
  const [on, setOn] = useState(initiallyOn);
  const [pending, startTransition] = useTransition();

  // If you open Settings in another tab after toggling, the server prop updates — keep the switch in sync.
  useEffect(() => {
    setOn(initiallyOn);
  }, [initiallyOn]);

  return (
    <div className="form-check form-switch mb-0 d-flex align-items-center">
      <input
        className="form-check-input flex-shrink-0"
        type="checkbox"
        role="switch"
        id="demo-mode-switch"
        checked={on}
        disabled={pending || !actionsEnabled}
        onChange={(e) => {
          if (!actionsEnabled) return;
          const next = e.target.checked;
          setOn(next);
          startTransition(() => {
            void setDemoModeAction(next);
          });
        }}
        aria-busy={pending}
        aria-label="Demo mode"
        title={!actionsEnabled ? "Set ALLOW_DEMO_DATA_SEED=true and restart the dev server to enable" : undefined}
      />
      <label className="form-check-label ms-3 mb-0" htmlFor="demo-mode-switch">
        <span className="fw-medium">{on ? "On" : "Off"}</span>
        {pending ? (
          <span className="text-body-secondary small ms-2">Updating…</span>
        ) : !actionsEnabled ? (
          <span className="text-body-secondary small ms-2 d-block d-sm-inline">
            Switch is locked until demo seed is enabled in the environment (see warning above).
          </span>
        ) : (
          <span className="text-body-secondary small ms-2 d-block d-sm-inline">
            {on ? "Synthetic data is loaded for this project." : "No demo seed data in this project."}
          </span>
        )}
      </label>
    </div>
  );
}
