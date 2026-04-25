import Link from "next/link";
import { auth } from "@/auth";
import { ModeLandingPage, type ModeLandingFeature, type ModeLandingStep } from "@/components/ui";
import { getCurrentProjectSummaryForUser } from "@/lib/current-project";

const STEPS: ModeLandingStep[] = [
  { step: "1", label: "Create a spec in Build" },
  { step: "2", label: "Mark it Shipped when merged" },
  { step: "3", label: "Monitor watches it for you" },
];

const FEATURES: readonly ModeLandingFeature[] = [
  {
    number: "01",
    title: "Session Replay Linking",
    description:
      "Feedback items linked to the LogRocket session replay where the issue occurred. One click from a complaint to watching what happened.",
  },
  {
    number: "02",
    title: "Release Health Dashboard",
    description:
      "7-day pre/post comparison of feedback volume, error rate, and rage clicks after each release. Know immediately if a ship made things better or worse.",
  },
  {
    number: "03",
    title: "Error → Feedback Pipeline",
    description:
      "LogRocket JS errors above a threshold auto-create feedback items in the Learn pipeline. No manual bug reporting needed.",
  },
  {
    number: "04",
    title: "Feature Adoption Tracking",
    description:
      "Session depth and engagement metrics per shipped spec, updated daily from LogRocket. Closes the loop between shipping and knowing it worked.",
  },
];

/**
 * Monitor area landing page.
 * Activates once specs exist and are marked Shipped in Build.
 * Uses the existing LogRocket integration (SyncLogRocketJob) as the data source.
 */
export default async function MonitorPage() {
  const session = await auth();
  const project = await getCurrentProjectSummaryForUser(Number(session?.user?.id));

  return (
    <ModeLandingPage
      title="Monitor"
      pageDescription={project ? `Release health for ${project.name}` : "Release health"}
      kickerText="Nothing to monitor yet"
      headline="Monitor activates when you ship"
      body={
        <>
          Once a spec in <strong>Build</strong> is marked as <strong>Shipped</strong>, Monitor
          starts watching it — pulling LogRocket session data and correlating new feedback to
          measure whether the feature is actually solving the problem.
        </>
      }
      cta={{ href: "/app/build", label: "Go to Build" }}
      steps={STEPS}
      roadmapTitle="Coming to Monitor"
      features={FEATURES}
    >
      {/* LogRocket integration notice — rendered in the optional middle slot */}
      <div className="rounded border border-secondary-subtle bg-body-secondary px-4 py-3 small text-body-secondary">
        <strong className="text-body-emphasis">Powered by LogRocket.</strong>{" "}
        Monitor uses your existing LogRocket integration — the same one already configured under{" "}
        <Link href="/app/integrations" className="link-primary">
          Integrations
        </Link>
        . No additional setup needed once you have a shipped spec.
      </div>
    </ModeLandingPage>
  );
}
