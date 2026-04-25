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
  },
  {
    number: "02",
    title: "Survey Builder",
    description:
      "Get a short 5-question survey aimed at the affected users to quantitatively confirm the insight. Edit and export before sending.",
  },
  {
    number: "03",
    title: "Assumption Mapper",
    description:
      "Every insight carries hidden assumptions. Claude surfaces them and suggests one way to test or disprove each — so you enter Build with eyes open.",
  },
  {
    number: "04",
    title: "Competitor Scan",
    description:
      "Find out how 2–3 comparable products handle the same problem. Claude suggests which competitors to research and what specifically to look for.",
  },
];

/**
 * Discovery mode landing page.
 * Shown when the user first arrives at /app/discover.
 * Once discovery activities exist, this page will redirect to the activities list.
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
      roadmapTitle="Coming to Discover"
      features={FEATURES}
    />
  );
}
