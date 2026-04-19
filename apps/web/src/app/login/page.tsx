import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  const showGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center px-3 py-5 position-relative bg-body-secondary kairos-auth-stage overflow-hidden">
      {/* Soft cyan / copper glows echo the brand kit (no heavy image load on first paint). */}
      <div className="kairos-auth-stage__glow" aria-hidden />
      <div className="position-absolute top-0 end-0 p-3" style={{ zIndex: 2 }}>
        <ThemeToggle />
      </div>
      <div className="position-relative" style={{ zIndex: 1 }}>
        <LoginForm showGoogle={showGoogle} />
      </div>
    </div>
  );
}
