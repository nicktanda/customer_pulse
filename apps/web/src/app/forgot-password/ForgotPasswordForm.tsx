"use client";

import { useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Something went wrong.");
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-100" style={{ maxWidth: "28rem" }}>
      <div className="text-center text-sm-start mb-4">
        <div className="d-inline-flex align-items-center gap-2 mb-2">
          <span aria-hidden="true" className="xf-brand-mark" />
          <p
            className="small fw-semibold text-uppercase mb-0"
            style={{ color: "var(--xf-accent)", letterSpacing: "0.08em", fontSize: "0.72rem" }}
          >
            xenoform.ai
          </p>
        </div>
        <h1 className="h3 mb-2">Reset your password</h1>
        <p className="text-body-secondary small mb-0">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <Card className="shadow-sm border-secondary-subtle">
        <Card.Body>
          {sent ? (
            <Alert variant="success" className="py-2 small mb-0">
              If an account with that email exists, we&apos;ve sent a password reset link. Check your inbox.
            </Alert>
          ) : (
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3" controlId="forgot-email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Form.Group>
              {error ? (
                <Alert variant="danger" className="py-2 small">
                  {error}
                </Alert>
              ) : null}
              <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
                {submitting ? "Sending\u2026" : "Send reset link"}
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
