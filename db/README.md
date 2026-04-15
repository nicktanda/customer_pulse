# Database

Schema is defined in TypeScript for Drizzle: [`packages/db/src/schema.ts`](../packages/db/src/schema.ts).

Older migration history for this database may have lived here in a previous stack; the Node app owns schema via **Drizzle** (`packages/db`, `drizzle-kit`). Apply changes against your PostgreSQL instance, or manage the database with your hosting provider’s tools.

For a **fresh empty database**, create the database, then use `drizzle-kit push` from `packages/db` (see that package’s `package.json` scripts) once you have wired migrations for your environment.
