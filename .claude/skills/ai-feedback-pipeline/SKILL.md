---
name: ai-feedback-pipeline
description: >-
  Change AI-powered feedback classification and processing using Anthropic in-app,
  prompts, batch jobs, and cost/failure behavior. Use when editing app/services/ai,
  feedback processing jobs, or anything that calls the Claude API for triage.
---

# AI feedback pipeline

The product uses the **Anthropic API** inside the Rails app to categorize, prioritize, and summarize feedback. Logic tends to live under **`app/services/ai/`** (e.g. **`feedback_processor`**) and is invoked from jobs such as batch processing.

## When to use

- Editing prompts, model parameters, or parsing of model output.
- Changing **`ProcessFeedbackJob`** / **`ProcessFeedbackBatchJob`** behavior related to AI.
- Investigating incorrect labels, timeouts, or API errors in development.

## Steps

1. Inspect **`app/services/ai/`** and existing specs under **`spec/services/ai/`**.
2. Treat the API as **fallible**: handle timeouts, rate limits, and malformed responses; align with job retry policies.
3. Consider **cost and latency**: batch where the codebase already does; avoid redundant calls per row when unnecessary.
4. Do **not** embed API keys in code; configuration uses **`ANTHROPIC_API_KEY`** (see README / **`.env.example`** for the name only).
5. After changes, run relevant **`bundle exec rspec`** paths and a local smoke test with **`bin/dev`** if you need end-to-end behavior.

## Notes

- Output quality changes are product-visible; mention them in PR descriptions for reviewers.
- Avoid logging full model prompts/responses if they contain customer PII.
