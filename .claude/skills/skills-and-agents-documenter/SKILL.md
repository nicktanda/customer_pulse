---
name: skills-and-agents-documenter
description: >-
  Regenerates the inventory at docs/skills-and-agents.md from .claude/skills and
  GitHub config (CI jobs, Dependabot, Sentry in apps/web). Use after adding, renaming,
  or removing skills; after changing ci.yml or dependabot.yml; or when CI fails the
  docs_inventory job.
---

# Skills and agents documenter

The repo keeps a **machine-generated** snapshot so everyone can see **which Claude skills exist** and **which automation jobs** are configured—without hand-maintaining a table.

## Where the record lives

| Output | Generator |
|--------|-----------|
| **[`docs/skills-and-agents.md`](../../docs/skills-and-agents.md)** | **`yarn document-skills`** → **`node scripts/document-skills-and-agents.mjs`** |

**Do not edit `docs/skills-and-agents.md` by hand** — it has HTML comments at the top saying it is auto-generated.

## When to use

- You added, renamed, or removed a folder under **`.claude/skills/`**.
- You changed **`.github/workflows/ci.yml`** or **`.github/dependabot.yml`**, or added/removed **`@sentry/*`** packages in **`apps/web`**.
- CI failed on the **`docs_inventory`** job (out-of-date inventory).

## Steps

1. From the repo root, run:

   ```bash
   yarn document-skills
   ```

2. Review **`git diff docs/skills-and-agents.md`**, then **commit** the updated file with your skill or workflow changes.

3. Optional **`--check`** (what CI runs): regenerates and exits with code **1** if the file would change — use locally to verify before push:

   ```bash
   node scripts/document-skills-and-agents.mjs --check
   ```

## Notes

- Narrative docs (**[`docs/agents.md`](../../docs/agents.md)**) stay human-written; the inventory **links** there for context.
- **[`CLAUDE.md`](../../../CLAUDE.md)** may summarize skills; **`docs/skills-and-agents.md`** is the **full list** with frontmatter descriptions.
