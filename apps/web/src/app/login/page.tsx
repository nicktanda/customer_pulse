import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const showGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center px-3 py-5 position-relative bg-body-secondary">
      {/* Theme control on the sign-in screen (no app sidebar yet). */}
      <div className="position-absolute top-0 end-0 p-3">
        <ThemeToggle />
      </div>
      <LoginForm showGoogle={showGoogle} />
    </div>
  );
}
