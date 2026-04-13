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
    return {
      techStack: existing.techStack,
      structure: existing.structure,
      conventions: existing.conventions,
      commitSha,
    };
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

  const structure = {
    totalFiles: files.length,
    topDirs: [...new Set(files.map((f) => f.split("/")[0]).filter(Boolean))].slice(0, 20),
    sampleFiles: files.slice(0, 50),
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
