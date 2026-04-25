import { auth } from "@/auth";
import { ModeLandingPage, type ModeLandingFeature, type ModeLandingStep } from "@/components/ui";
import { getCurrentProjectSummaryForUser } from "@/lib/current-project";

const STEPS: ModeLandingStep[] = [
  { step: "1", label: "Find an insight in Learn" },
  { step: "2", label: "Click Create spec" },
  { step: "3", label: "AI drafts it, you refine" },
];

const FEATURES: readonly ModeLandingFeature[] = [
  {
    number: "01",
    title: "Spec Generator",
    description:
      "Select one or more insights and let Claude draft user stories and acceptance criteria. Edit and lock before handing to engineering.",
  },
  {
    number: "02",
    title: "Spec Board",
    description:
      "Kanban board moving specs through Backlog → Drafting → Review → Ready → In Progress → Shipped. One view of everything in flight.",
  },
  {
    number: "03",
    title: "Effort / Impact Planner",
    description:
      "2×2 matrix plotting your specs by AI-estimated effort and customer impact. Quick wins highlighted. Drag to override.",
  },
  {
    number: "04",
    title: "GitHub Sync",
    description:
      "Push a spec as a GitHub Issue with one click. PR merge automatically advances the spec to Shipped and hands off to Monitor.",
  },
];

/**
 * Build area landing page — shown when there are no specs yet.
 * Once specs exist this will redirect to /app/build/board.
 */
export default async function BuildPage() {
  const session = await auth();
  const project = await getCurrentProjectSummaryForUser(Number(session?.user?.id));

  return (
    <ModeLandingPage
      title="Build"
      pageDescription={project ? `Specs for ${project.name}` : "Specs"}
      kickerText="No specs yet"
      headline="Start in Learn, finish in Build"
      body={
        <>
          Specs are born from insights. Head to <strong>Learn → Insights</strong>, find a pattern
          worth solving, and click <strong>Create spec</strong>. Claude will draft the user stories
          and acceptance criteria from the customer evidence already captured.
        </>
      }
      cta={{ href: "/app/learn/insights", label: "Open Insights" }}
      steps={STEPS}
      roadmapTitle="Coming to Build"
      features={FEATURES}
    />
  );
}
