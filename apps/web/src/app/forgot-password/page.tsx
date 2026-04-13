import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ForgotPasswordPage() {
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center px-3 py-5 position-relative bg-body-secondary">
      <div className="position-absolute top-0 end-0 p-3">
        <ThemeToggle />
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
