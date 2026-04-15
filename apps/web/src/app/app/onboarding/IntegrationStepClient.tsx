"use client";

import { useRef, useState } from "react";
import { TestConnectionButton } from "./TestConnectionButton";

export function IntegrationStepClient({
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
