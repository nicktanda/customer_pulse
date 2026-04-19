"use client";

/**
 * If the Settings server component throws (database unreachable, migration mismatch, etc.),
 * Next.js shows this client UI instead of a blank page — so you get a readable error and a retry.
 */
export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-page-shell app-page-shell--medium py-5">
      <h1 className="h4 text-body-emphasis">Settings could not be loaded</h1>
      <p className="small text-body-secondary mt-2 mb-4">
        Something went wrong while loading this page. Details below can help when reporting the issue.
      </p>
      <pre className="small rounded border border-secondary-subtle bg-body-secondary p-3 text-break mb-4">
        {error.message}
      </pre>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
