"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { KairosWordmark } from "@/components/KairosWordmark";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError("An account with this email already exists. Try signing in instead.");
        } else {
          setError(body.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      // Auto sign-in after successful registration
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/app",
      });
      if (signInRes?.ok) {
        router.push("/app");
        router.refresh();
      } else {
        // Registration succeeded but auto sign-in failed — send to login
        router.push("/login");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-100" style={{ maxWidth: "28rem" }}>
      <div className="text-center text-sm-start mb-4">
        <KairosWordmark className="mb-3" />
        <h1 className="h3 mb-2">Create an account</h1>
        <p className="text-body-secondary small mb-0">
          Sign up to start collecting and analyzing customer feedback.
        </p>
      </div>

      <Card className="shadow-sm border-secondary-subtle">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3" controlId="signup-name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="signup-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="signup-password">
              <Form.Label>Password</Form.Label>
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
            {error ? (
              <Alert variant="danger" className="py-2 small">
                {error}
              </Alert>
            ) : null}
            <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
              {submitting ? "Creating account\u2026" : "Create account"}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <p className="text-center small text-body-secondary mt-3 mb-0">
        Already have an account?{" "}
        <a href="/login" className="text-decoration-none">
          Sign in
        </a>
      </p>
    </div>
  );
}
