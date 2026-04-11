---
name: customer-documentation
description: >-
  Writes or reviews end-user and integrator-facing documentation: in-app UI copy,
  onboarding steps, integration setup (Linear, Slack, Jira, API), emails, and public
  README sections meant for operators. Use when customers need clearer instructions
  or when shipping features that change what users see or configure.
---

# Customer documentation

**Customer documentation** is anything **non-developers** (or **integrators**) use to succeed with the product: first-time setup, connecting tools, understanding the digest email, and using the public API safely.

## When to use

- Editing **onboarding** or **settings** UI under **`apps/web/src/app/app/`** (guided steps, labels, helper text).
- Improving **integration** instructions (Linear, Slack, Google Forms, Jira, custom API) in UI or **`README.md`** sections aimed at operators.
- Clarifying **pulse email** content, subject lines, or **pulse report** explanations.
- Documenting **`POST /api/v1/feedback`** for API consumers (authentication, fields, examples) in README or a dedicated customer-facing doc.
- Writing **release notes** or short **“what changed”** blurbs for admins (pairs with **`product-ui-pr-review`**).

## Steps

1. **Identify the audience** — Admin configuring integrations vs developer calling the API vs recipient reading the digest. Adjust depth and jargon.
2. **Match the product** — Steps must reflect real URLs (**`/app/onboarding`**, **`/app/settings`**, etc.) and the matching files under **`apps/web/src/app/app/`**. Wrong paths erode trust.
3. **Safety** — Never document “disable webhook verification” as a fix. Prefer secure defaults and troubleshooting that doesn’t expose secrets.
4. **Examples** — Use placeholder domains and fake API keys in examples; say “your-domain.com” and “your-api-key” explicitly.
5. **Consistency** — Terminology (e.g. “Customer Pulse”, “integration”, “feedback”) should match the rest of the app and emails.

## Notes

- **Customer docs** can live in README (public), in-app only, or a future `/help` — follow whatever structure the repo already uses.
- **Developer setup** belongs in **`dev-documentation`**, not here.
