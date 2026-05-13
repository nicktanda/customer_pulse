/**
 * GitHub repo analyzer — fetches repo structure and identifies tech stack.
 * Ported from Rails RepoAnalyzer.
 */
import { eq, desc } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { repoAnalyses } from "@customer-pulse/db/client";

interface GithubCreds {
  access_token: string;
  owner: string;
  repo: string;
  default_branch?: string;
}

export interface RepoContext {
  techStack: Record<string, unknown>;
  structure: Record<string, unknown>;
  conventions: Record<string, unknown>;
  commitSha: string;
}

export async function analyzeRepo(
  db: Database,
  integrationId: number,
  creds: GithubCreds,
): Promise<RepoContext> {
  const { access_token, owner, repo, default_branch } = creds;
  const branch = default_branch || "main";
  const headers: Record<string, string> = {
    Authorization: `token ${access_token}`,
    Accept: "application/vnd.github.v3+json",
  };

  // Get latest commit SHA
  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });
  if (!refRes.ok) throw new Error(`GitHub ref: HTTP ${refRes.status}`);
  const refJson = (await refRes.json()) as { object?: { sha?: string } };
  const commitSha = refJson.object?.sha ?? "";

  // Check if we already have a recent analysis for this SHA
  const [existing] = await db
    .select()
    .from(repoAnalyses)
    .where(eq(repoAnalyses.integrationId, integrationId))
    .orderBy(desc(repoAnalyses.analyzedAt))
    .limit(1);

  if (existing && existing.commitSha === commitSha) {
    // Skip the cache if it predates the `existingDirs` or `dirsByExtension`
    // fields — without them the path-mismatch check has no data to compare
    // against, so we'd rather pay the tree-fetch than silently degrade the
    // safety net.
    const cachedStructure = existing.structure as Record<string, unknown>;
    if (Array.isArray(cachedStructure.existingDirs) && cachedStructure.dirsByExtension && typeof cachedStructure.dirsByExtension === "object") {
      return {
        techStack: existing.techStack,
        structure: existing.structure,
        conventions: existing.conventions,
        commitSha,
      };
    }
  }

  // Fetch repo tree (recursive, top-level)
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error(`GitHub tree: HTTP ${treeRes.status}`);
  const treeJson = (await treeRes.json()) as { tree?: { path: string; type: string }[] };
  const files = (treeJson.tree ?? []).filter((t) => t.type === "blob").map((t) => t.path);

  // Detect tech stack from file patterns
  const techStack: Record<string, unknown> = {};
  if (files.some((f) => f.endsWith("package.json"))) techStack.node = true;
  if (files.some((f) => f.endsWith("Gemfile"))) techStack.ruby = true;
  if (files.some((f) => f.endsWith("requirements.txt") || f.endsWith("pyproject.toml"))) techStack.python = true;
  if (files.some((f) => f.endsWith("go.mod"))) techStack.go = true;
  if (files.some((f) => f.endsWith(".tsx") || f.endsWith(".jsx"))) techStack.react = true;
  if (files.some((f) => f.includes("next.config"))) techStack.nextjs = true;

  const extensions = new Set(files.map((f) => f.split(".").pop()).filter(Boolean));
  techStack.extensions = [...extensions].slice(0, 20);

  // Collect every existing directory path that an actual file lives in,
  // up to 4 segments deep. Used by the deterministic path-mismatch check
  // to verify auto-generated files don't introduce a new top-level layout
  // (e.g. `apps/web/components/...` when `apps/web/src/components/...` is
  // the convention).
  const existingDirs = new Set<string>();
  // Additionally, record which directories contain files of which extension,
  // so we can catch convention mismatches like creating `apps/web/src/Foo.tsx`
  // when every other `.tsx` lives under `apps/web/src/components/...`.
  // Shape: { tsx: ["apps/web/src/components", ...], ts: [...], ... }
  const extDirsRaw: Record<string, Set<string>> = {};
  for (const f of files) {
    const parts = f.split("/");
    for (let depth = 1; depth < Math.min(parts.length, 5); depth++) {
      existingDirs.add(parts.slice(0, depth).join("/"));
    }
    if (parts.length >= 2) {
      const filename = parts[parts.length - 1];
      const ext = filename.split(".").pop()?.toLowerCase();
      if (ext && ext !== filename) {
        const dir = parts.slice(0, -1).join("/");
        (extDirsRaw[ext] ??= new Set()).add(dir);
      }
    }
  }
  const dirsByExtension: Record<string, string[]> = {};
  for (const [ext, dirs] of Object.entries(extDirsRaw)) {
    dirsByExtension[ext] = [...dirs];
  }

  const structure = {
    totalFiles: files.length,
    topDirs: [...new Set(files.map((f) => f.split("/")[0]).filter(Boolean))].slice(0, 20),
    sampleFiles: files.slice(0, 50),
    existingDirs: [...existingDirs],
    dirsByExtension,
  };

  const conventions: Record<string, unknown> = {};
  if (files.some((f) => f.includes(".eslintrc") || f.includes("eslint.config"))) conventions.linting = "eslint";
  if (files.some((f) => f.includes(".prettierrc") || f.includes("prettier.config"))) conventions.formatting = "prettier";
  if (files.some((f) => f.includes("tsconfig"))) conventions.typescript = true;

  const now = new Date();
  await db.insert(repoAnalyses).values({
    integrationId,
    commitSha,
    techStack,
    structure,
    conventions,
    analyzedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return { techStack, structure, conventions, commitSha };
}

/**
 * Deterministic check: flags newly-created file paths that violate the
 * repo's existing layout. Two classes of finding:
 *
 *   1. Prefix mismatch — the new file's parent directory chain doesn't
 *      exist in the repo at all (e.g. `apps/web/components/Foo.tsx` when
 *      the repo only has `apps/web/src/components/`).
 *   2. Convention mismatch — the parent directory exists but no other
 *      file of the same extension lives there, while a descendant
 *      directory does have files of that extension (e.g. dropping
 *      `apps/web/src/Foo.tsx` directly when every other `.tsx` lives at
 *      `apps/web/src/components/...`). This catches the loose-files-in-
 *      `src/` case that bit PR #71.
 *
 * Used by both the QA reviewer (as a hard-fail signal that the model
 * cannot rationalise away) and the code generator (as a self-check that
 * triggers a retry with the failing paths fed back into the prompt).
 */
export function findPathMismatches(
  filesChanged: { path: string; action: string }[],
  repoContext: RepoContext | null,
): string[] {
  if (!repoContext) return [];
  const structure = repoContext.structure as { existingDirs?: string[]; dirsByExtension?: Record<string, string[]> };
  const existing = new Set(structure.existingDirs ?? []);
  if (existing.size === 0) return [];
  const dirsByExt = structure.dirsByExtension ?? {};

  const findings: string[] = [];
  const seenPaths = new Set<string>();
  for (const f of filesChanged) {
    if (f.action !== "create") continue;
    if (seenPaths.has(f.path)) continue;
    seenPaths.add(f.path);

    const parts = f.path.split("/");

    // 1. Prefix mismatch — walk depths 2..4 looking for the deepest
    // existing prefix; if missing but a wrapper-segment sibling exists,
    // name it.
    let prefixFlagged = false;
    for (let depth = 2; depth <= Math.min(4, parts.length - 1); depth++) {
      const prefix = parts.slice(0, depth).join("/");
      if (existing.has(prefix)) continue;
      const tail = parts[depth - 1];
      const parent = parts.slice(0, depth - 1).join("/");
      const sibling = [...existing].find((d) => {
        const dParts = d.split("/");
        return dParts.length === depth + 1
          && dParts.slice(0, depth - 1).join("/") === parent
          && dParts[depth] === tail;
      });
      if (sibling) {
        findings.push(`\`${f.path}\` — prefix \`${prefix}\` does not exist; the repo has \`${sibling}\` (note the extra \`${sibling.split("/")[depth - 1]}\` segment). Files belong under the existing prefix.`);
      } else {
        findings.push(`\`${f.path}\` — prefix \`${prefix}\` is not present in the repo's existing directories. Verify this isn't a typo or a missing convention segment.`);
      }
      prefixFlagged = true;
      break;
    }
    if (prefixFlagged) continue;

    // 2. Convention mismatch — the parent dir exists, but no other file
    // of this extension lives there, while a descendant does. We only
    // flag when the descendant evidence is strong (≥ 2 distinct
    // descendant dirs hold this extension) so single-file edge cases
    // don't get false-flagged.
    const filename = parts[parts.length - 1];
    const ext = filename.split(".").pop()?.toLowerCase();
    if (!ext || ext === filename) continue;
    const parentDir = parts.slice(0, -1).join("/");
    const dirsWithExt = dirsByExt[ext] ?? [];
    if (dirsWithExt.length === 0) continue;
    if (dirsWithExt.includes(parentDir)) continue; // convention met
    const descendants = dirsWithExt.filter((d) => d.startsWith(parentDir + "/"));
    if (descendants.length < 2) continue;
    descendants.sort((a, b) => a.length - b.length);
    findings.push(`\`${f.path}\` — no existing \`.${ext}\` files live at \`${parentDir}\`; sibling \`.${ext}\` files in this area are organised under subdirectories such as \`${descendants[0]}\`. Place this file inside an appropriate subdirectory to match the repo convention.`);
  }
  return findings;
}

/**
 * Splits a unified diff into a map of `path → added-content` (i.e. the `+`
 * lines for that file, with the leading `+` stripped). Used by the
 * reachability check to look at what each file in the PR actually adds.
 */
function parseDiffByFile(diff: string): Map<string, string> {
  const result = new Map<string, string>();
  // First chunk before the initial `diff --git ` is empty; subsequent chunks
  // each describe one file.
  const sections = diff.split(/^diff --git /m);
  for (const section of sections) {
    if (!section) continue;
    const pathMatch = section.match(/^\+\+\+ b\/(.+)$/m);
    if (!pathMatch) continue;
    const added: string[] = [];
    for (const line of section.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        added.push(line.slice(1));
      }
    }
    result.set(pathMatch[1], added.join("\n"));
  }
  return result;
}

const NEXTJS_AUTO_DISCOVERED = new Set([
  "page.tsx", "page.ts", "page.jsx", "page.js",
  "layout.tsx", "layout.ts", "layout.jsx", "layout.js",
  "route.ts", "route.tsx", "route.js", "route.jsx",
  "loading.tsx", "loading.ts",
  "error.tsx", "error.ts",
  "not-found.tsx", "not-found.ts",
  "default.tsx", "default.ts",
  "global-error.tsx", "global-error.ts",
  "template.tsx", "template.ts",
]);

function isComponentLike(path: string): boolean {
  if (!/\.(tsx|ts|jsx|js)$/.test(path)) return false;
  const filename = path.split("/").pop() ?? "";
  if (NEXTJS_AUTO_DISCOVERED.has(filename)) return false;
  if (/\.(test|spec)\.[jt]sx?$/.test(filename)) return false;
  if (filename === "index.ts" || filename === "index.tsx") return false;
  return true;
}

/**
 * Deterministic reachability check: flags newly-created component files
 * that aren't imported, rendered, or referenced by any other file in the
 * PR. Catches the failure mode where the model creates a component
 * (e.g. AccentColorPicker.tsx) but never wires it into a page or layout
 * — the feature exists in code but isn't reachable from any UI surface.
 *
 * Skips Next.js auto-discovered files (page.tsx, layout.tsx, route.ts,
 * etc.) because the framework reaches them by file convention without
 * an explicit import. Skips test files. Skips index.ts barrel files
 * (they re-export rather than consume).
 */
export function findUnreachableComponents(
  filesChanged: { path: string; action: string }[],
  diff: string,
): string[] {
  if (!diff) return [];
  const byPath = parseDiffByFile(diff);
  const findings: string[] = [];

  for (const f of filesChanged) {
    if (f.action !== "create") continue;
    if (!isComponentLike(f.path)) continue;

    const baseName = (f.path.split("/").pop() ?? "").replace(/\.(tsx|ts|jsx|js)$/, "");
    const dirName = f.path.split("/").slice(-2, -1)[0] ?? "";

    let referenced = false;
    for (const [otherPath, otherContent] of byPath) {
      if (otherPath === f.path) continue;
      // Heuristics — any of these signals consumption:
      //   - import-style mention of the parent directory name
      //   - JSX usage `<Name`
      //   - named-import `{ Name`
      //   - bare reference to the component identifier in a non-comment line
      if (
        otherContent.includes(`/${dirName}"`) ||
        otherContent.includes(`/${dirName}'`) ||
        otherContent.includes(`/${dirName}/`) ||
        otherContent.includes(`<${baseName}`) ||
        otherContent.includes(`{ ${baseName}`) ||
        otherContent.includes(`, ${baseName}`) ||
        otherContent.includes(`{${baseName}`) ||
        new RegExp(`\\b${baseName}\\b`).test(otherContent)
      ) {
        referenced = true;
        break;
      }
    }

    if (!referenced) {
      findings.push(`\`${f.path}\` — new component is never imported, rendered, or referenced by any other file in this PR. Add a Next.js \`page.tsx\` (or \`layout.tsx\`) under \`apps/web/src/app/...\` that renders it, or update an existing page/layout to use it. Otherwise users cannot reach the feature.`);
    }
  }
  return findings;
}

/**
 * Detects new `page.tsx` (or layout/route) files created outside the
 * repo's established user-facing route tree.
 *
 * Catches the failure mode where the model wires up a feature at a
 * top-level route (e.g. `apps/web/src/app/settings/page.tsx`) when this
 * codebase actually serves logged-in users under a nested prefix (e.g.
 * `apps/web/src/app/app/...`). The page renders fine at the URL, but
 * real users never see it because they live behind auth at `/app/*`.
 *
 * The "correct" prefix is inferred from existing `page.tsx` files in
 * the repo's sample paths — whichever first segment under
 * `apps/web/src/app/` is most commonly used by existing pages is the
 * one new user-facing pages should sit under. Falls back to silence
 * if there's no clear convention to compare against.
 */
export function findMisplacedNewPages(
  filesChanged: { path: string; action: string }[],
  repoContext: RepoContext | null,
): string[] {
  if (!repoContext) return [];
  const sampleFiles = (repoContext.structure as { sampleFiles?: string[] }).sampleFiles ?? [];
  const APP_PREFIX = "apps/web/src/app/";
  const PAGE_RE = /\/(page|layout|route)\.(tsx|ts|jsx|js)$/;

  // Bucket every existing app-router file by its first segment under app/.
  const segCounts = new Map<string, number>();
  for (const p of sampleFiles) {
    if (!p.startsWith(APP_PREFIX) || !PAGE_RE.test(p)) continue;
    const rest = p.slice(APP_PREFIX.length);
    const seg = rest.split("/")[0] ?? "";
    // A page at `apps/web/src/app/page.tsx` has empty first segment — that's
    // the root route, not a useful convention signal.
    if (!seg || seg.endsWith(".tsx") || seg.endsWith(".ts") || seg.endsWith(".jsx") || seg.endsWith(".js")) continue;
    segCounts.set(seg, (segCounts.get(seg) ?? 0) + 1);
  }
  if (segCounts.size === 0) return [];

  const sorted = [...segCounts.entries()].sort((a, b) => b[1] - a[1]);
  const [topSeg, topCount] = sorted[0]!;
  // Only treat the top segment as canonical when it clearly dominates —
  // otherwise multiple segments are legitimate (e.g. an app with both
  // `(marketing)` and `(app)` groups).
  const totalPages = sorted.reduce((acc, [, c]) => acc + c, 0);
  if (topCount / totalPages < 0.6) return [];

  // The "established" segments are everything that already has pages.
  const knownSegs = new Set(sorted.map(([s]) => s));

  const findings: string[] = [];
  for (const f of filesChanged) {
    if (f.action !== "create") continue;
    if (!f.path.startsWith(APP_PREFIX)) continue;
    if (!PAGE_RE.test(f.path)) continue;
    const rest = f.path.slice(APP_PREFIX.length);
    const newSeg = rest.split("/")[0] ?? "";
    if (!newSeg || knownSegs.has(newSeg)) continue;
    findings.push(
      `\`${f.path}\` — new route segment \`/${newSeg}\` is outside the repo's established user-facing tree. ` +
      `Existing pages live under \`apps/web/src/app/${topSeg}/...\` (the authenticated/logged-in route prefix). ` +
      `A new \`/${newSeg}\` route at the top level will not be reachable through the app's normal navigation — ` +
      `real users live behind auth at \`/${topSeg}/...\`. Move this file to \`apps/web/src/app/${topSeg}/<segment>/page.tsx\` ` +
      `(or modify an existing page under \`apps/web/src/app/${topSeg}/...\` to consume the new component).`,
    );
  }
  return findings;
}
