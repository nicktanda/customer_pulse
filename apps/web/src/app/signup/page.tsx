import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "./SignupForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center px-3 py-5 position-relative bg-body-secondary">
      <div className="position-absolute top-0 end-0 p-3">
        <ThemeToggle />
      </div>
      <SignupForm />
    </div>
  );
}
