"use client";

import { Card, Form, Button, Alert } from "react-bootstrap";
import { updateProfileAction, changePasswordAction } from "./actions";
import { useActionState } from "react";

function ProfileSection({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <Card className="shadow-sm border-secondary-subtle mb-4" style={{ maxWidth: "28rem" }}>
      <Card.Header className="bg-transparent">
        <h2 className="h6 mb-0">Profile</h2>
      </Card.Header>
      <Card.Body>
        <form action={updateProfileAction}>
          <Form.Group className="mb-3" controlId="account-name">
            <Form.Label>Name</Form.Label>
            <Form.Control type="text" name="name" required defaultValue={userName} autoComplete="name" />
          </Form.Group>
          <Form.Group className="mb-3" controlId="account-email">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" name="email" required defaultValue={userEmail} autoComplete="email" />
          </Form.Group>
          <Button type="submit" variant="primary" size="sm">
            Save
          </Button>
        </form>
      </Card.Body>
    </Card>
  );
}

function PasswordSection() {
  const [state, formAction] = useActionState(changePasswordAction, null);

  return (
    <Card className="shadow-sm border-secondary-subtle" style={{ maxWidth: "28rem" }}>
      <Card.Header className="bg-transparent">
        <h2 className="h6 mb-0">Change password</h2>
      </Card.Header>
      <Card.Body>
        <form action={formAction}>
          <Form.Group className="mb-3" controlId="account-current-password">
            <Form.Label>Current password</Form.Label>
            <Form.Control type="password" name="current_password" required autoComplete="current-password" />
          </Form.Group>
          <Form.Group className="mb-3" controlId="account-new-password">
            <Form.Label>New password</Form.Label>
            <Form.Control type="password" name="new_password" required minLength={8} autoComplete="new-password" />
            <Form.Text className="text-body-secondary">At least 8 characters.</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="account-confirm-password">
            <Form.Label>Confirm new password</Form.Label>
            <Form.Control type="password" name="confirm_password" required minLength={8} autoComplete="new-password" />
          </Form.Group>
          {state?.error ? (
            <Alert variant="danger" className="py-2 small">
              {state.error}
            </Alert>
          ) : null}
          <Button type="submit" variant="primary" size="sm">
            Change password
          </Button>
        </form>
      </Card.Body>
    </Card>
  );
}

export function AccountForm({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <>
      <ProfileSection userName={userName} userEmail={userEmail} />
      <PasswordSection />
    </>
  );
}
