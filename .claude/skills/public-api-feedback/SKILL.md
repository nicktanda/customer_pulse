---
name: public-api-feedback
description: >-
  Design or change the public HTTP API for submitting feedback (api/v1/feedback),
  including authentication, validation, and compatibility with external clients.
  Use when editing Api::V1::FeedbackController, routes under api/v1, or request specs.
---

# Public API — feedback ingestion

The app exposes **`POST /api/v1/feedback`** (see **`config/routes.rb`**) for programmatic feedback submission. Changes can break external integrations; treat the contract as a product surface.

## When to use

- Changing **`app/controllers/api/v1/feedback_controller.rb`** (or related code).
- Adjusting required fields, response codes, or API-key behavior.
- Adding tests under **`spec/requests/api/v1/`**.

## Steps

1. Read existing **`spec/requests/api/v1/feedback_spec.rb`** for current contract expectations.
2. Keep responses predictable: clear **HTTP status**, JSON error bodies, and stable field names.
3. Ensure authentication/authorization matches product intent (API keys, rate limits if any).
4. Update any user-facing docs in **`README.md`** if the public contract changes.
5. Run **`bundle exec rspec spec/requests/api/v1/`** after edits.

## Notes

- Coordinate with **webhooks** and **integrations** skills if the same domain entities are affected.
- Never commit real API keys; use **`.env.example`** for variable names only.
