---
name: ai-feedback-pipeline
description: >-
  Change AI-powered feedback classification and processing using Anthropic: prompts,
  worker job behavior, and cost/failure handling. Use when editing apps/worker
  Anthropic HTTP calls, reporting helpers, or enqueue paths from the web app.
---

# AI feedback pipeline

The product calls the **Anthropic Messages API** from **`apps/worker`** (see **`apps/worker/src/job-handlers.ts`** for **`process_feedback`** and **`reporting_nl`**; **`reporting-nl.ts`** and **`reporting-structured.ts`** hold reporting helpers). **Next.js** enqueues jobs with **BullMQ** from **`apps/web`** (e.g. feedback actions and **`api/app/reporting/ask`**) using queue names defined in **`apps/web/src/lib/queue-names.ts`** — they must stay in sync with **`apps/worker/src/queue-names.ts`**. Use the same **`REDIS_URL`** as the worker.

## When to use

- Editing prompts, model parameters, or parsing of model output in the worker.
- Changing **`process_feedback`** or batch/reporting behavior.
- Investigating incorrect labels, timeouts, or API errors in development.

## Steps

1. Inspect **`apps/worker/src/job-handlers.ts`** and reporting modules under **`apps/worker/src/`**.
2. Treat the API as **fallible**: handle non-OK responses, timeouts, and malformed JSON; align with BullMQ retry settings.
3. Consider **cost and latency**: avoid redundant calls per row; batch or summarize where the codebase already does.
4. Do **not** embed API keys in code; use **`ANTHROPIC_API_KEY`** (see README / **`.env.example`** for the name only).
5. After changes, run **`yarn test`** and smoke-test with **`yarn dev`** if you need end-to-end behavior.

## Notes

- Output quality changes are product-visible; mention them in PR descriptions for reviewers.
- Avoid logging full model prompts/responses if they contain customer PII.
