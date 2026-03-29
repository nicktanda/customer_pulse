---
name: encrypted-integrations
description: >-
  Work with third-party integrations and encrypted credentials (Lockbox), including
  the Integration model and connection tests. Use when editing app/models/integration.rb,
  integration controllers, or secrets storage for Linear, Slack, Google, etc.
---

# Encrypted integrations (Lockbox)

Integration credentials must stay encrypted at rest. The app uses **Lockbox** patterns and **`LOCKBOX_MASTER_KEY`** (see README / **`.env.example`** for the variable name). The **`Integration`** model and related UI live in **`app/models/`**, **`app/controllers/integrations_controller.rb`**, and views.

## When to use

- Adding a new integration type or credential field.
- Fixing decrypt/encrypt errors after key rotation or bad env config.
- Changing **`test_connection`** or **`sync_now`** behavior on integrations.

## Steps

1. Read **`app/models/integration.rb`** and follow existing attribute encryption and validations.
2. Never log decrypted secrets; avoid printing credentials in exception messages.
3. When adding fields, plan migrations and backfill if needed (see **database-migrations-rollout**).
4. Exercise **connection test** flows from the UI or specs where they exist.
5. Document new env vars in **`README.md`** / **`.env.example`** as **names only**.

## Notes

- Rotating **`LOCKBOX_MASTER_KEY`** without a migration plan will make existing ciphertext unreadable — treat key changes as a release-critical operation.
