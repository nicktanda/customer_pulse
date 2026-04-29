import { PageHeader, PageShell } from "@/components/ui";
import { NewProjectForm } from "./NewProjectForm";

export default function NewProjectPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="New project"
        description="Creates a project and makes you the owner."
        back={{ href: "/app/projects", label: "Projects" }}
      />
      <NewProjectForm />
    </PageShell>
  );
}
