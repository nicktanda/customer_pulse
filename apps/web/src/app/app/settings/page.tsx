import { auth } from "@/auth";
import {
  getCurrentProjectIdForUser,
  getCurrentProjectSummaryForUser,
  listUserProjects,
} from "@/data/projects";
import { UserRole } from "@/data/users";
import { userCanEditProject } from "@/data/projects";
import {
  DemoModeCard,
  GeneralSettingsForm,
  NotificationSettingsForm,
  PageShell,
  ProjectAccessDenied,
} from "@/components/ui";
import Link from "next/link";

const DEFAULT_SETTINGS = {
  pulseSendTime: "09:00",
  pulseFrequency: "weekly",
  notificationsEnabled: true,
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { project?: string };
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const userProjects = await listUserProjects(userId);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);

  if (!projectId || !projectSummary) {
    return (
      <PageShell title="Settings">
        <ProjectAccessDenied projects={userProjects} />
      </PageShell>
    );
  }

  const settings = {
    ...DEFAULT_SETTINGS,
    ...(projectSummary.settings ?? {}),
  };

  const canEdit = await userCanEditProject(userId, projectId);
  const isAdmin = session?.user?.role === UserRole.admin;
  const demoSeedEnabled = process.env.ALLOW_DEMO_DATA_SEED === "true";
  const showDemoModeCard = canEdit && isAdmin;

  return (
    <PageShell title="Settings">
      <GeneralSettingsForm
        projectId={projectId}
        projectName={projectSummary.name}
        canEdit={canEdit}
        defaultValues={{
          name: projectSummary.name,
          pulseSendTime: settings.pulseSendTime,
          pulseFrequency: settings.pulseFrequency,
        }}
      />

      {/* Appearance / personalisation */}
      <section className="card shadow-sm border-secondary-subtle">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">Appearance</h2>
          <p className="small text-body-secondary mt-1 mb-3">
            Personalise the interface — accent colour, theme, and other visual preferences.
          </p>
          <Link
            href="/app/settings/appearance"
            className="btn btn-outline-secondary btn-sm"
          >
            <span aria-hidden="true">🎨</span>{" "}
            <span>Open appearance settings</span>
          </Link>
        </div>
      </section>

      <section className="card shadow-sm border-secondary-subtle">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">Active project</h2>
        </div>
      </section>

      <NotificationSettingsForm
        projectId={projectId}
        canEdit={canEdit}
        defaultValues={{
          notificationsEnabled: settings.notificationsEnabled,
          pulseSendTime: settings.pulseSendTime,
          pulseFrequency: settings.pulseFrequency,
        }}
      />

      {showDemoModeCard && (
        <DemoModeCard
          projectId={projectId}
          demoSeedEnabled={demoSeedEnabled}
        />
      )}
    </PageShell>
  );
}
