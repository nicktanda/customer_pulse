import Link from "next/link";
import { auth } from "@/auth";
import { ModeLandingPage, type ModeLandingFeature, type ModeLandingStep } from "@/components/ui";
import { getCurrentProjectSummaryForUser } from "@/lib/current-project";

const STEPS: ModeLandingStep[] = [
  { step: "1", label: "Pick an insight you want to investigate further" },
  { step: "2", label: "Add discovery activities — interviews, surveys, data queries, competitor scans" },
  { step: "3", label: "Complete each activity and record your findings" },
  { step: "4", label: "When confident, click Create spec to move to Build" },
];

const FEATURES: readonly ModeLandingFeature[] = [
  {
    number: "01",
    title: "Interview Guide Generator",
    description:
      "Claude reads the insight evidence and drafts a set of open-ended interview questions tailored to the specific problem. Paste into your scheduling tool and go.",
    availability: "available",
    action: { href: "/app/learn/insights", label: "Add this from an insight" },
  },
  {
    number: "02",
    title: "Survey Builder",
    description:
      "Get a short 5-question survey aimed at the affected users to quantitatively confirm the insight. Edit and export before sending.",
    availability: "available",
    action: { href: "/app/learn/insights", label: "Add this from an insight" },
  },
  {
    number: "03",
    title: "Assumption Mapper",
    description:
      "Every insight carries hidden assumptions. Claude surfaces them and suggests one way to test or disprove each — so you enter Build with eyes open.",
    availability: "available",
    action: { href: "/app/learn/insights", label: "Add this from an insight" },
  },
  {
    number: "04",
    title: "Competitor Scan",
    description:
      "Find out how 2–3 comparable products handle the same problem. Claude suggests which competitors to research and what specifically to look for.",
    availability: "available",
    action: { href: "/app/learn/insights", label: "Add this from an insight" },
  },
];

/**
 * Discovery mode landing page.
 * Shown when the user first arrives at /app/discover.
 *
 * Note: the interview guide, survey, assumption map, and competitor scan **UIs** live on
 * `/app/discover/activities/[id]` after you add an activity from an insight — this page
 * explains how to get there and lists what each tool does.
 */
export default async function DiscoverPage() {
  const session = await auth();
  const project = await getCurrentProjectSummaryForUser(Number(session?.user?.id));

  return (
    <ModeLandingPage
      title="Discover"
      pageDescription={project ? `Discovery for ${project.name}` : "Discovery"}
      kickerText="Validate before you build"
      headline="Know your insight is real before you invest in a solution"
      body={
        <>
          Discovery gives you a structured way to back up an insight with interviews, surveys,
          competitor research, and data — so when you do start building, you are building the
          right thing. Every activity links back to the insight that prompted it, keeping the
          trail of evidence intact.
        </>
      }
      cta={{ href: "/app/learn/insights", label: "Browse Insights" }}
      steps={STEPS}
      roadmapTitle="Discovery tools"
      features={FEATURES}
    >
      {/*
        Without this block, the list below still looked like a “coming soon” roadmap even though
        types 1–4 are implemented on the activity detail page — so PMs assumed nothing was live.
      */}
      <div className="rounded border border-secondary-subtle bg-body-secondary px-4 py-3">
        <p className="small fw-semibold text-body-emphasis mb-2">Where to use these</p>
        <p className="small text-body-secondary mb-2">
          Open an insight, then add a discovery activity. The interview guide, survey, assumption map,
          and competitor experiences open on the activity page after you create it (you will see{" "}
          <strong>Draft with AI</strong>, copy/export buttons, and the rest there — not on this overview).
        </p>
        <ul className="small text-body-secondary mb-0 ps-3">
          <li className="mb-1">
            From Learn: open an insight → <strong>Start Discovery</strong> (or use the Discover menu).
          </li>
          <li className="mb-1">
            <Link href="/app/learn/insights" className="fw-medium">
              Browse all insights
            </Link>{" "}
            ·{" "}
            <Link href="/app/discover/insights" className="fw-medium">
              Insights already in discovery
            </Link>
          </li>
        </ul>
      </div>
    </ModeLandingPage>
  );
}
