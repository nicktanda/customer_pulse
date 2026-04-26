import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader, PageShell } from "./index";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModeLandingStep = {
  /** Short numeric label displayed in the circle ("1", "2", "3"). */
  step: string;
  /** One-line description of the step. */
  label: string;
};

export type ModeLandingFeature = {
  /** Zero-padded display number ("01", "02", …). */
  number: string;
  title: string;
  description: string;
};

type ModeLandingPageProps = {
  /** Page title shown in the `PageHeader`. */
  title: string;
  /** Optional sub-description next to the title (usually "for ProjectName"). */
  pageDescription?: string;
  /** Small-caps kicker above the hero headline, e.g. "No specs yet". */
  kickerText: string;
  /** Hero heading. */
  headline: string;
  /** Hero body paragraph. */
  body: ReactNode;
  /** Primary CTA button. */
  cta: { href: string; label: string };
  /** Three activation steps shown to the right of the hero text. */
  steps: ModeLandingStep[];
  /** Label above the numbered feature list, e.g. "Coming to Build". */
  roadmapTitle: string;
  /** Numbered feature preview items. */
  features: readonly ModeLandingFeature[];
  /**
   * Optional slot rendered between the hero and the roadmap.
   * Used by Monitor for the LogRocket integration notice.
   */
  children?: ReactNode;
};

// ── Sub-components (not exported — composed internally) ───────────────────────

/**
 * Numbered circle-step list shown on the right side of the mode hero.
 * Each step is a number in a small rounded box + one-line label.
 */
function NumberedStepList({ steps }: { steps: ModeLandingStep[] }) {
  return (
    <div
      className="d-flex flex-column gap-3"
      style={{ flex: "0 0 auto", width: "100%", maxWidth: "18rem" }}
    >
      {steps.map(({ step, label }) => (
        <div key={step} className="d-flex align-items-center gap-3">
          <span
            className="mode-step-circle"
            aria-hidden="true"
          >
            {step}
          </span>
          <span className="small text-body-secondary">{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Numbered feature preview list — shown below the hero as a "coming soon" roadmap.
 * Each row: zero-padded number in tabular text + title + description.
 */
function UpcomingFeatureList({ features }: { features: readonly ModeLandingFeature[] }) {
  return (
    <div className="d-flex flex-column">
      {features.map((f, i) => (
        <div
          key={f.number}
          className={`d-flex gap-4 py-4${i < features.length - 1 ? " border-bottom border-secondary-subtle" : ""}`}
        >
          <span className="mode-feature-number" aria-hidden="true">
            {f.number}
          </span>
          <div>
            <p className="fw-semibold text-body-emphasis mb-1 small">{f.title}</p>
            <p className="small text-body-secondary mb-0">{f.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Standard layout for a mode area landing page (Build, Monitor, etc.)
 * when there is no data yet to show.
 *
 * Structure:
 *   PageHeader
 *   → Hero: kicker + headline + body + CTA  |  numbered steps
 *   → [optional children slot]
 *   → Numbered feature roadmap
 *
 * @example
 * ```tsx
 * <ModeLandingPage
 *   title="Build"
 *   kickerText="No specs yet"
 *   headline="Start in Learn, finish in Build"
 *   body="Find an insight, click Create spec, AI drafts it."
 *   cta={{ href: "/app/insights", label: "Open Insights" }}
 *   steps={[{ step: "1", label: "Find an insight in Learn" }, ...]}
 *   roadmapTitle="Coming to Build"
 *   features={UPCOMING_FEATURES}
 * />
 * ```
 */
export function ModeLandingPage({
  title,
  pageDescription,
  kickerText,
  headline,
  body,
  cta,
  steps,
  roadmapTitle,
  features,
  children,
}: ModeLandingPageProps) {
  return (
    <PageShell width="wide">
      <PageHeader title={title} description={pageDescription} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="d-flex flex-column flex-md-row align-items-md-center gap-4 gap-md-5 py-5 border-bottom border-secondary-subtle mb-5">
        {/* Left: kicker + headline + body + CTA */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <p className="mode-section-label mb-1">{kickerText}</p>
          <h2
            className="h4 mb-3"
            style={{ lineHeight: 1.3, color: "var(--k-ember-deep)" }}
          >
            {headline}
          </h2>
          <p className="text-body-secondary mb-4" style={{ maxWidth: "30rem" }}>
            {body}
          </p>
          <Link href={cta.href} className="btn btn-primary">
            {cta.label}
          </Link>
        </div>

        {/* Right: numbered activation steps */}
        <NumberedStepList steps={steps} />
      </div>

      {/* ── Optional middle slot (e.g. integration notice) ───────────────── */}
      {children ? <div className="mb-5">{children}</div> : null}

      {/* ── Upcoming features roadmap ─────────────────────────────────────── */}
      <div>
        <p className="mode-section-label mb-4">{roadmapTitle}</p>
        <UpcomingFeatureList features={features} />
      </div>
    </PageShell>
  );
}
