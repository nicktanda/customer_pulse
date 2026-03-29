---
name: email-pulse-and-recipients
description: >-
  Change the Customer Pulse email digest, recipients, mailers, and resend flows.
  Use when editing app/mailers, SendDailyPulseJob, pulse reports, or email_recipients.
---

# Email pulse and recipients

The product sends a **daily “Customer Pulse”** digest and exposes **pulse reports** with actions like resend. Mailers live under **`app/mailers/`**; scheduling is tied to Sidekiq jobs such as **`SendDailyPulseJob`**. Recipients are managed via **`email_recipients`** routes.

## When to use

- Changing email copy, layout, or delivery conditions.
- Editing **`app/views/`** mailer templates or pulse report pages.
- Adjusting recipient lists, permissions, or resend behavior.

## Steps

1. Trace the flow from **`config/routes.rb`** (`pulse_reports`, `recipients`) to controllers and mailers.
2. Use **ActionMailer** conventions already present; keep previews/test hooks if the project adds them.
3. For deliverability, verify **Sidekiq** `mailers` queue behavior and error handling (see **sidekiq-jobs-and-schedules**).
4. Run targeted specs if mail or jobs have coverage; manually verify in dev with safe test recipients (no real customer spam).
5. Product review: subject lines and body content are user-visible — call out changes in the PR.

## Notes

- Email content may contain aggregated customer feedback — handle PII according to team policy.
