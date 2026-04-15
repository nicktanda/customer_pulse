import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@customer-pulse/db/client";
import { PageHeader, PageShell, InlineAlert } from "@/components/ui";
import { AccountForm } from "./AccountForm";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);

  if (!user) {
    redirect("/login");
  }

  const success = sp.success === "profile" ? "Profile updated." : sp.success === "password" ? "Password changed." : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <PageShell width="full">
      <PageHeader title="Account" description="Manage your profile and password." />

      {success ? <InlineAlert variant="success">{success}</InlineAlert> : null}
      {error ? <InlineAlert variant="danger">{error}</InlineAlert> : null}

      <AccountForm userName={user.name ?? ""} userEmail={user.email} />
    </PageShell>
  );
}
