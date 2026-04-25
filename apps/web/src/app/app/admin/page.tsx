// This is a React Server Component — it fetches data and renders HTML on the server.
// No "use client" directive needed here because it doesn't use any browser-only features.

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@customer-pulse/db/client";
import { PageHeader, PageShell, InlineAlert, FormActions } from "@/components/ui";
import { createFeedbackAction } from "./actions";

// The page receives `searchParams` from Next.js — it contains any ?key=value from the URL,
// which we use to show success/error messages after a form submission.
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Make sure only admins can see this page
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.admin) {
    redirect("/app");
  }

  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <PageShell width="medium" className="d-flex flex-column gap-5">
      <PageHeader
        title="Admin"
        description="Tools for testing and development. Only visible to admin users."
      />

      {/* Success / error banners that appear after the form submits */}
      {notice === "created" && (
        <InlineAlert variant="success">
          Feedback created! It will appear in the Feedback list and will be queued for AI
          classification if the worker is running.
        </InlineAlert>
      )}
      {error === "missing_content" && (
        <InlineAlert variant="danger">Content is required — please fill it in.</InlineAlert>
      )}
      {error === "no_project" && (
        <InlineAlert variant="warning">
          No active project found. Go to Settings and select a project first.
        </InlineAlert>
      )}

      {/*
       * Create Feedback card
       * This lets you manually submit feedback into the current project — useful for
       * testing the AI pipeline or populating the app without real integrations.
       */}
      <section className="card shadow-sm border-secondary-subtle">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis mb-1">Create feedback</h2>
          <p className="small text-body-secondary mt-1 mb-4">
            Manually add a feedback item to the current project. It will show up in the Feedback
            list and be queued for AI classification if the worker is running.
          </p>

          {/*
           * action={createFeedbackAction} wires this form up to the server action we wrote
           * in actions.ts. When the user clicks "Create", the browser sends the form data
           * directly to the server — no JavaScript fetch needed.
           */}
          <form action={createFeedbackAction} className="d-flex flex-column gap-3">
            {/* Content — the main body of the feedback (required) */}
            <div>
              <label htmlFor="admin-content" className="form-label">
                Content <span className="text-danger">*</span>
              </label>
              <textarea
                id="admin-content"
                name="content"
                rows={4}
                required
                className="form-control"
                placeholder="e.g. The dashboard takes too long to load on mobile…"
              />
              <div className="form-text">
                The main body of the feedback. This is what the AI will classify.
              </div>
            </div>

            {/* Title — short one-liner, optional */}
            <div>
              <label htmlFor="admin-title" className="form-label">
                Title <span className="text-body-secondary fw-normal">(optional)</span>
              </label>
              <input
                id="admin-title"
                name="title"
                type="text"
                className="form-control"
                placeholder="e.g. Dashboard loads slowly on mobile"
              />
            </div>

            {/* Author fields — simulate a real user submitting feedback */}
            <div className="row g-3">
              <div className="col-sm-6">
                <label htmlFor="admin-author-name" className="form-label">
                  Author name <span className="text-body-secondary fw-normal">(optional)</span>
                </label>
                <input
                  id="admin-author-name"
                  name="author_name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Jane Smith"
                />
              </div>
              <div className="col-sm-6">
                <label htmlFor="admin-author-email" className="form-label">
                  Author email <span className="text-body-secondary fw-normal">(optional)</span>
                </label>
                <input
                  id="admin-author-email"
                  name="author_email"
                  type="email"
                  className="form-control"
                  placeholder="e.g. jane@example.com"
                />
              </div>
            </div>

            {/* Category and priority dropdowns */}
            <div className="row g-3">
              <div className="col-sm-6">
                <label htmlFor="admin-category" className="form-label">
                  Category
                </label>
                {/*
                 * The <select> value corresponds to the integer enum in FeedbackCategory.
                 * uncategorized=0, bug=1, feature_request=2, complaint=3
                 */}
                <select id="admin-category" name="category" className="form-select" defaultValue="0">
                  <option value="0">Uncategorized</option>
                  <option value="1">Bug</option>
                  <option value="2">Feature request</option>
                  <option value="3">Complaint</option>
                </select>
              </div>
              <div className="col-sm-6">
                <label htmlFor="admin-priority" className="form-label">
                  Priority
                </label>
                {/*
                 * Corresponds to FeedbackPriority enum.
                 * unset=0, p1=1, p2=2, p3=3, p4=4
                 */}
                <select id="admin-priority" name="priority" className="form-select" defaultValue="0">
                  <option value="0">Unset</option>
                  <option value="1">P1 — Critical</option>
                  <option value="2">P2 — High</option>
                  <option value="3">P3 — Medium</option>
                  <option value="4">P4 — Low</option>
                </select>
              </div>
            </div>

            <FormActions variant="plain">
              <button type="submit" className="btn btn-primary">
                Create feedback
              </button>
            </FormActions>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
