"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";

/**
 * Turn whatever signIn / fetch rejected with into text for the UI.
 * - Real Errors use .message.
 * - DOM Event stringifies as "[object Event]" if you reject(event); we show something clearer.
 */
function formatSignInFailure(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message || "Sign-in failed.";
  }
  if (typeof reason === "object" && reason !== null && "type" in reason) {
    const ev = reason as { type?: string };
    if (typeof ev.type === "string") {
      return `Something went wrong (${ev.type}). Try again or refresh the page.`;
    }
  }
  const s = String(reason);
  if (s === "[object Event]") {
    return "Sign-in failed (browser event). Try again or check the Network tab for /api/auth.";
  }
  return s || "Sign-in failed.";
}

export function LoginForm({ showGoogle }: { showGoogle: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // React does not await async event handlers — any uncaught rejection from signIn becomes
    // an "unhandledrejection" and Next.js shows Error: [object Event]. Always try/catch here.
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/app",
      });
      if (res?.error) {
        setError("Invalid email or password.");
      } else if (res?.ok) {
        router.push("/app");
        router.refresh();
      } else if (res == null) {
        // e.g. getProviders failed and next-auth redirected to /error (you may not see this state)
        setError("Could not reach sign-in. Check that the app is running and /api/auth works.");
      }
    } catch (reason) {
      setError(formatSignInFailure(reason));
    }
  }

  async function onGoogleClick() {
    setError(null);
    try {
      // Default redirect is true (OAuth flow). Still catch JSON/network errors before redirect.
      await signIn("google", { callbackUrl: "/app" });
    } catch (reason) {
      setError(formatSignInFailure(reason));
    }
  }

  return (
    <div className="w-100" style={{ maxWidth: "28rem" }}>
      <div className="text-center text-sm-start mb-4">
        <p className="small fw-semibold text-uppercase text-body-secondary mb-1">Customer Pulse</p>
        <h1 className="h3 mb-2">Sign in</h1>
        <p className="text-body-secondary small mb-0">
          Use your workspace email and password{showGoogle ? ", or continue with Google" : ""}.
          {process.env.NODE_ENV === "development" ? (
            <>
              {" "}
              Local dev accounts: run{" "}
              <code className="px-1 rounded bg-body-secondary">node scripts/bootstrap-dev-user.mjs</code> (see README).
            </>
          ) : null}
        </p>
      </div>

      <Card className="shadow-sm border-secondary-subtle">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3" controlId="login-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="login-password">
              <div className="d-flex justify-content-between align-items-baseline">
                <Form.Label>Password</Form.Label>
                <a href="/forgot-password" className="small text-decoration-none">
                  Forgot password?
                </a>
              </div>
              <Form.Control
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Form.Group>
            {error ? (
              <Alert variant="danger" className="py-2 small">
                {error}
              </Alert>
            ) : null}
            <Button type="submit" variant="primary" className="w-100">
              Sign in
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {showGoogle ? (
        <Button type="button" variant="outline-secondary" className="w-100 mt-3" onClick={() => void onGoogleClick()}>
          Continue with Google
        </Button>
      ) : null}

      <p className="text-center small text-body-secondary mt-3 mb-0">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="text-decoration-none">
          Sign up
        </a>
      </p>
    </div>
  );
}
