---
name: email-pulse-and-recipients
description: >-
  Change the Kairos email digest, recipients, mail flows, and resend actions.
  Use when editing worker mail jobs, pulse report UI, or email_recipients data paths.
---

# Email pulse and recipients

The product sends a **daily Kairos digest** and exposes **pulse reports** in the app with actions like resend. Delivery is handled from **`apps/worker`** via the **`cp-mailers`** BullMQ queue (see **`apps/worker/src/queue-names.ts`** and **`job-handlers.ts`** for **`SendDailyPulseJob`** / **`ResendPulseReportJob`**). UI and server actions live under **`apps/web/src/app/app/pulse-reports/`** and **`apps/web/src/app/app/recipients/`** (email recipient CRUD).

## When to use

- Changing email copy, layout, or delivery conditions.
- Editing React email templates or pulse report pages in **`apps/web`**.
- Adjusting recipient lists, permissions, or resend behavior.

## Steps

1. Trace the flow from **`apps/web/src/app/app/pulse-reports/`** and related **`actions.ts`** into **`apps/worker/src/job-handlers.ts`** for queued mail work.
2. Follow existing patterns for HTML/text bodies and error handling; keep production safe from accidental spam (test recipients only in dev).
3. For deliverability, verify **BullMQ** **`cp-mailers`** queue behavior and retries (**`bullmq-jobs-and-schedules`**).
4. Run **`yarn test`** for affected packages; manually verify in dev with safe test recipients.
5. Product review: subject lines and body content are user-visible — call out changes in the PR.

## Notes

- Email content may contain aggregated customer feedback — handle PII according to team policy.
