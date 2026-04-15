# Verifying Lockbox compatibility (Rails ↔ Node)

The TypeScript implementation lives in [`packages/db/src/lockbox.ts`](../../../packages/db/src/lockbox.ts). It matches the Ruby **lockbox** gem’s AES-256-GCM layout and HKDF key derivation for `integrations` / `credentials`.

## Automated self-test

From the repo root:

```bash
yarn test:db
```

This runs a Node-only encrypt/decrypt round-trip (`packages/db/src/lockbox.test.ts`).

## Cross-check against Rails (staging)

1. In **Rails console** on a database that uses your real key:

   ```ruby
   i = Integration.custom.enabled.first
   puts i.parsed_credentials.keys.inspect
   ```

2. In **Node** (same `LOCKBOX_MASTER_KEY` and `DATABASE_URL`):

   ```bash
   node --input-type=module -e "
   import { createDb, decryptCredentialsColumn, integrations } from './packages/db/src/index.ts';
   import { eq } from 'drizzle-orm';
   const db = createDb(process.env.DATABASE_URL);
   const rows = await db.select().from(integrations).where(eq(integrations.id, YOUR_ID)).limit(1);
   console.log(decryptCredentialsColumn(rows[0].credentialsCiphertext, process.env.LOCKBOX_MASTER_KEY));
   "
   ```

   (Adjust import path if you compile `packages/db` to `dist` first.)

3. Compare JSON strings — they must match character-for-character after parse.

If decryption fails, confirm the master key has **never** rotated without re-encrypting ciphertext (Rails `Integration` model clears bad ciphertext when decryption fails).
