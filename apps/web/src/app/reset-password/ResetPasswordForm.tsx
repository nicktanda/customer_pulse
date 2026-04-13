"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";

function ResetPasswordFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-100" style={{ maxWidth: "28rem" }}>
      <div className="text-center text-sm-start mb-4">
        <p className="small fw-semibold text-uppercase text-body-secondary mb-1">Customer Pulse</p>
        <h1 className="h3 mb-2">Set a new password</h1>
        <p className="text-body-secondary small mb-0">Enter your new password below.</p>
      </div>

      <Card className="shadow-sm border-secondary-subtle">
        <Card.Body>
          {success ? (
            <Alert variant="success" className="py-2 small mb-0">
              Your password has been reset.{" "}
              <a href="/login" className="alert-link">
                Sign in
              </a>{" "}
              with your new password.
            </Alert>
          ) : (
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3" controlId="reset-password">
                <Form.Label>New password</Form.Label>
                <Form.Control
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Form.Text className="text-body-secondary">At least 8 characters.</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3" controlId="reset-confirm-password">
                <Form.Label>Confirm password</Form.Label>
                <Form.Control
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Form.Group>
              {error ? (
                <Alert variant="danger" className="py-2 small">
                  {error}
                </Alert>
              ) : null}
              <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
                {submitting ? "Resetting\u2026" : "Reset password"}
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>

      <p className="text-center small text-body-secondary mt-3 mb-0">
        <a href="/login" className="text-decoration-none">
          Back to sign in
        </a>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
