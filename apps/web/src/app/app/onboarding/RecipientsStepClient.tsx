"use client";

import { useState } from "react";

export function RecipientsStepClient({
  savedEmail,
  savedName,
  formActions,
}: {
  savedEmail: string;
  savedName: string;
  formActions: React.ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  return (
    <>
      <input type="hidden" name="_onboarding_step" value="recipients" />
      <p className="small text-body-secondary mb-0">Optional: add a digest recipient for the current project.</p>
      {savedEmail ? (
        <div className="alert alert-success py-2 small mb-0">
          Recipient already added: <strong>{savedEmail}</strong>
          {savedName ? ` (${savedName})` : ""}. You can add another or continue.
        </div>
      ) : null}
      <div>
        <label htmlFor="onb-recipient-email" className="form-label">
          Email
        </label>
        <input
          id="onb-recipient-email"
          name="recipient_email"
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="onb-recipient-name" className="form-label">
          Name (optional)
        </label>
        <input
          id="onb-recipient-name"
          name="recipient_name"
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {formActions}
    </>
  );
}
