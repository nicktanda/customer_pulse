/**
 * AI code generator — generates code changes from idea + repo context.
 * Ported from Rails CodeGenerator.
 */
import { callClaudeJson } from "../ai/call-claude.js";
import { findPathMismatches, type RepoContext } from "./repo-analyzer.js";

export interface FileChange {
  path: string;
  content: string;
  action: "create" | "modify";
}

export interface CodeGenerationResult {
  files: FileChange[];
  summary: string;
  commit_message: string;
}

const MAX_PATH_RETRIES = 2;

const SYSTEM_PROMPT = `You are a senior software engineer generating code changes for a product idea. You have context about the repository's tech stack and structure.

Generate the minimal set of file changes needed to implement the idea. For each file change, provide:
- "path": the file path relative to the repository root
- "content": the COMPLETE file content (not a diff)
- "action": "create" for new files, "modify" for changes to existing files

Also provide:
- "summary": 2-3 sentence description of the changes
- "commit_message": a concise commit message

Return a JSON object with "files", "summary", and "commit_message" fields.
Respond with ONLY the JSON object, no markdown fences.

Important:
- Write clean, production-quality code
- Follow the repository's existing conventions (indentation, naming, etc.)
- Include necessary imports
- Don't delete existing functionality unless required
- Keep changes focused and minimal

PATH RULES (hard requirements):
- Every \`path\` you emit MUST sit under a directory that already exists in the repository tree.
- The user message lists the repo's allowed directory prefixes verbatim. Place new files only under one of those prefixes.
- If a similar component already lives at \`apps/web/src/components/...\`, NEW components belong at \`apps/web/src/components/...\` — never at \`apps/web/components/...\`. The same rule applies to \`lib/\`, \`hooks/\`, \`app/\`, \`styles/\`, etc.
- Do NOT invent new top-level directories. If you think a new subtree is genuinely needed, place it under an existing prefix instead.`;

function buildAllowedPrefixes(repoContext: RepoContext): string[] {
  const structure = repoContext.structure as { existingDirs?: string[] };
  const dirs = structure.existingDirs ?? [];
  // Surface depth-2 and depth-3 directories — depth-1 is too coarse, depth-4
  // is mostly noise. Skip vendor noise so the model isn't told it can write
  // into node_modules.
  const noisy = /(^|\/)(node_modules|dist|\.next|build|coverage|\.turbo)(\/|$)/;
  return dirs
    .filter((d) => !noisy.test(d))
    .filter((d) => {
      const segments = d.split("/").length;
      return segments === 2 || segments === 3;
    })
    .sort();
}

export async function generateCode(
  ideaTitle: string,
  ideaDescription: string,
  implementationHints: string[],
  repoContext: RepoContext,
): Promise<CodeGenerationResult | null> {
  const allowedPrefixes = buildAllowedPrefixes(repoContext);

  const contextStr = [
    `Tech Stack: ${JSON.stringify(repoContext.techStack)}`,
    `Structure: Top dirs: ${JSON.stringify((repoContext.structure as { topDirs?: string[] }).topDirs ?? [])}`,
    `Conventions: ${JSON.stringify(repoContext.conventions)}`,
    `Sample files: ${JSON.stringify(((repoContext.structure as { sampleFiles?: string[] }).sampleFiles ?? []).slice(0, 20))}`,
    "",
    `Allowed directory prefixes (every "path" you emit must sit under one of these):`,
    ...allowedPrefixes.map((p) => `  - ${p}`),
  ].join("\n");

  const hintsStr = implementationHints.length > 0
    ? `\nImplementation hints:\n${implementationHints.map((h) => `- ${h}`).join("\n")}`
    : "";

  const baseUser = `Repository context:\n${contextStr}\n\nIdea: "${ideaTitle}"\n${ideaDescription}${hintsStr}`;
  let retryFeedback = "";

  // Self-validate the model's output against the deterministic path check
  // and retry on mismatch — the same model that produced the wrong paths
  // gets told exactly which paths failed and what the correct prefix is.
  for (let attempt = 0; attempt <= MAX_PATH_RETRIES; attempt++) {
    const result = await callClaudeJson<CodeGenerationResult>({
      system: SYSTEM_PROMPT,
      user: retryFeedback ? `${baseUser}\n\n${retryFeedback}` : baseUser,
      maxTokens: 64000,
    });
    if (!result?.files?.length) return result;

    const mismatches = findPathMismatches(result.files, repoContext);
    if (mismatches.length === 0) {
      if (attempt > 0) console.log(`[code-gen] path validation passed after ${attempt} retr${attempt === 1 ? "y" : "ies"}`);
      return result;
    }

    if (attempt === MAX_PATH_RETRIES) {
      console.warn(`[code-gen] path validation still failed after ${MAX_PATH_RETRIES} retries — returning result for QA to flag`);
      return result;
    }

    console.log(`[code-gen] path validation failed (attempt ${attempt + 1}), retrying with corrections`);
    retryFeedback = [
      `## PRIOR ATTEMPT PLACED FILES AT WRONG PATHS`,
      ``,
      `Your previous response put these files outside the repo's existing layout:`,
      ...mismatches.map((m) => `- ${m}`),
      ``,
      `Re-emit ALL files with corrected paths under the allowed directory prefixes listed above. Do not return any file at the wrong path.`,
    ].join("\n");
  }

  return null;
}
