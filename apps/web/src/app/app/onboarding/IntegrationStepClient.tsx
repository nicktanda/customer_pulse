"use client";

import { useEffect, useRef, useState } from "react";
import { TestConnectionButton } from "./TestConnectionButton";

/**
 * Item 6: per-integration structured field schema.
 *
 * Tokens never go to Claude — this is a plain Zod-ish schema that drives a structured form.
 * Switching the wizard from JSON-paste to per-field inputs keeps secrets out of the prompt path.
 */
type FieldSpec = {
  key: string;
  label: string;
  hint?: string;
  type?: "text" | "password" | "url";
  placeholder?: string;
  required?: boolean;
};

const FIELD_SCHEMAS: Record<string, FieldSpec[]> = {
  slack: [
    { key: "bot_token", label: "Bot user OAuth token", type: "password", placeholder: "xoxb-…", required: true, hint: "From Slack app → OAuth & Permissions." },
    { key: "signing_secret", label: "Signing secret", type: "password", placeholder: "abc123…", required: true, hint: "From Slack app → Basic Information." },
    { key: "default_channel", label: "Default channel", type: "text", placeholder: "#feedback", hint: "Optional — channel feedback gets posted to." },
  ],
  linear: [
    { key: "api_key", label: "Personal API key", type: "password", placeholder: "lin_api_…", required: true, hint: "linear.app → Settings → API." },
    { key: "team_id", label: "Team ID", type: "text", placeholder: "ENG", hint: "Optional — restricts ingest to one team." },
  ],
  jira: [
    { key: "site_url", label: "Jira site URL", type: "url", placeholder: "https://acme.atlassian.net", required: true },
    { key: "email", label: "User email", type: "text", required: true },
    { key: "api_token", label: "API token", type: "password", required: true, hint: "id.atlassian.com → Security → API tokens." },
    { key: "project_key", label: "Project key", type: "text", placeholder: "FEED", hint: "Optional — limits ingest to one Jira project." },
  ],
  google_form: [
    { key: "form_id", label: "Form ID", type: "text", required: true, hint: "From the form URL: /forms/d/<form_id>/edit." },
    { key: "service_account_json", label: "Service account JSON", type: "password", required: true, hint: "Whole JSON contents — encrypted at rest, never sent to Claude." },
  ],
};

export function IntegrationStepClient({
  step,
  example,
  formActions,
}: {
  step: string;
  example: string;
  formActions: React.ReactNode;
}) {
  const fields = FIELD_SCHEMAS[step] ?? null;
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  // Keep the hidden credentials_json in sync so the existing server action can parse it as before.
  useEffect(() => {
    if (!hiddenRef.current) return;
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v.trim().length > 0),
    );
    hiddenRef.current.value = Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : "";
  }, [values]);

  function update(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function getCredentials(): Record<string, unknown> | null {
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v.trim().length > 0),
    );
    if (Object.keys(cleaned).length === 0) return null;
    return cleaned;
  }

  // Fallback to the legacy JSON paste path for any integration we don't have a structured schema for.
  if (!fields) {
    return <LegacyJsonStep step={step} example={example} formActions={formActions} />;
  }

  return (
    <>
      <input type="hidden" name="_onboarding_step" value={step} />
      <input type="hidden" ref={hiddenRef} name="credentials_json" defaultValue="" />
      <p className="small text-body-secondary mb-0">
        Fill the fields below — credentials are encrypted at rest and never sent to Claude.
      </p>
      {fields.map((f) => (
        <div key={f.key}>
          <label htmlFor={`onb-${step}-${f.key}`} className="form-label small">
            {f.label}
            {f.required ? <span className="text-danger ms-1">*</span> : null}
          </label>
          <input
            id={`onb-${step}-${f.key}`}
            type={f.type === "password" ? "password" : f.type === "url" ? "url" : "text"}
            autoComplete="off"
            placeholder={f.placeholder}
            className="form-control"
            value={values[f.key] ?? ""}
            onChange={(e) => update(f.key, e.target.value)}
          />
          {f.hint ? <div className="form-text">{f.hint}</div> : null}
        </div>
      ))}
      <TestConnectionButton type={step} getCredentials={getCredentials} />
      {formActions}
    </>
  );
}

/**
 * Pre-Item-6 fallback for integrations we haven't migrated to structured inputs yet.
 * Keeps the original JSON paste experience exactly as it was.
 */
function LegacyJsonStep({
  step,
  example,
  formActions,
}: {
  step: string;
  example: string;
  formActions: React.ReactNode;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function getCredentials(): Record<string, unknown> | null {
    const raw = textareaRef.current?.value?.trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return (
    <>
      <input type="hidden" name="_onboarding_step" value={step} />
      <p className="small text-body-secondary mb-0">
        Paste credentials as JSON — they are encrypted at rest. Example:{" "}
        <code className="d-inline-block text-break px-1 rounded bg-body-secondary small">{example}</code>
      </p>
      <div>
        <label htmlFor="onb-creds-json" className="form-label">
          Credentials JSON (optional)
        </label>
        <textarea
          ref={textareaRef}
          id="onb-creds-json"
          name="credentials_json"
          rows={5}
          className="form-control font-monospace small"
          placeholder={example}
        />
      </div>
      <TestConnectionButton type={step} getCredentials={getCredentials} />
      {formActions}
    </>
  );
}

export function GitHubStepClient({ formActions }: { formActions: React.ReactNode }) {
  const tokenRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);
  const repoRef = useRef<HTMLInputElement>(null);
  const branchRef = useRef<HTMLInputElement>(null);

  function getCredentials(): Record<string, unknown> | null {
    const token = tokenRef.current?.value?.trim();
    if (!token) return null;
    return {
      access_token: token,
      owner: ownerRef.current?.value?.trim() ?? "",
      repo: repoRef.current?.value?.trim() ?? "",
      default_branch: branchRef.current?.value?.trim() || "main",
    };
  }

  // Build the hidden JSON field so the server action can parse it
  function handleChange() {
    const creds = getCredentials();
    const hidden = document.getElementById("onb-github-json") as HTMLInputElement | null;
    if (hidden) {
      hidden.value = creds ? JSON.stringify(creds) : "";
    }
  }

  return (
    <>
      <input type="hidden" name="_onboarding_step" value="github" />
      <input type="hidden" id="onb-github-json" name="credentials_json" defaultValue="" />
      <p className="small text-body-secondary mb-0">
        Connect a GitHub repo for AI-generated pull requests.{" "}
        <a
          href="https://github.com/settings/tokens/new?scopes=repo&description=Customer+Pulse"
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none"
        >
          Create a personal access token
        </a>{" "}
        with <code className="px-1 rounded bg-body-secondary">repo</code> scope.
      </p>
      <div>
        <label htmlFor="onb-gh-token" className="form-label small">Access token</label>
        <input ref={tokenRef} id="onb-gh-token" type="password" autoComplete="off" placeholder="ghp_..." className="form-control" onChange={handleChange} />
      </div>
      <div className="row g-2">
        <div className="col">
          <label htmlFor="onb-gh-owner" className="form-label small">Owner (org or user)</label>
          <input ref={ownerRef} id="onb-gh-owner" placeholder="my-org" className="form-control" onChange={handleChange} />
        </div>
        <div className="col">
          <label htmlFor="onb-gh-repo" className="form-label small">Repository</label>
          <input ref={repoRef} id="onb-gh-repo" placeholder="my-app" className="form-control" onChange={handleChange} />
        </div>
      </div>
      <div>
        <label htmlFor="onb-gh-branch" className="form-label small">Default branch</label>
        <input ref={branchRef} id="onb-gh-branch" defaultValue="main" className="form-control" onChange={handleChange} />
      </div>
      <TestConnectionButton type="github" getCredentials={getCredentials} />
      {formActions}
    </>
  );
}

export function AnthropicStepClient({ formActions }: { formActions: React.ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function getCredentials(): Record<string, unknown> | null {
    const key = inputRef.current?.value?.trim();
    if (!key) return null;
    return { api_key: key };
  }

  return (
    <>
      <input type="hidden" name="_onboarding_step" value="anthropic_api" />
      <p className="small text-body-secondary mb-0">
        Enter your Anthropic API key to enable AI-powered feedback classification, insight discovery, and reporting.
        Get one from{" "}
        <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
          console.anthropic.com
        </a>
        . You can skip and configure later in Settings.
      </p>
      <div>
        <label htmlFor="onboarding-anthropic-key" className="form-label small">API key</label>
        <input
          ref={inputRef}
          id="onboarding-anthropic-key"
          name="anthropic_api_key"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-..."
          className="form-control"
        />
      </div>
      <TestConnectionButton type="anthropic_api" getCredentials={getCredentials} />
      {formActions}
    </>
  );
}
