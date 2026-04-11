import { INTEGRATION_SOURCE_OPTIONS } from "@/lib/integration-source-meta";
import { credentialJsonExampleForSourceType } from "@/lib/integration-credential-examples";
import { createIntegrationAction } from "../actions";
import { FormActions, InlineAlert, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";

export default async function NewIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : null;

  return (
    <PageShell width="narrow">
      <PageHeader title="New integration" back={{ href: "/app/integrations", label: "Integrations" }} />
      {err === "json" ? (
        <InlineAlert variant="danger">Credentials must be valid JSON.</InlineAlert>
      ) : null}
      <NarrowCardForm action={createIntegrationAction} className="mt-4">
        <p className="small text-body-secondary mb-0">
          Pick a source, then paste a single JSON object with the keys that integration expects. Values are encrypted
          before storage. If you are unsure of the shape, open the examples below or ask your administrator for the
          project&apos;s integration runbook.
        </p>
        <div>
          <label htmlFor="int-name" className="form-label">
            Name
          </label>
          <input id="int-name" name="name" required className="form-control" />
        </div>
        <div>
          <label htmlFor="int-source" className="form-label">
            Source type
          </label>
          <select id="int-source" name="source_type" required className="form-select">
            {INTEGRATION_SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="int-creds" className="form-label">
            Credentials JSON
          </label>
          <textarea
            id="int-creds"
            name="credentials_json"
            rows={6}
            className="form-control font-monospace small"
            placeholder='{"api_key":"..."}'
          />
        </div>
        <details className="small border rounded p-3 bg-body-secondary bg-opacity-25">
          <summary className="fw-medium" style={{ cursor: "pointer" }}>
            Example JSON by source type
          </summary>
          <p className="text-body-secondary mt-2 mb-2">
            These are minimal templates — your team may require extra fields. Invalid JSON shows an error after save.
          </p>
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
            {INTEGRATION_SOURCE_OPTIONS.map((o) => (
              <li key={o.value}>
                <span className="fw-medium text-body">{o.label}:</span>{" "}
                <code className="d-inline-block text-break small">{credentialJsonExampleForSourceType(o.value)}</code>
              </li>
            ))}
          </ul>
        </details>
        <FormActions variant="plain">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </FormActions>
      </NarrowCardForm>
    </PageShell>
  );
}
