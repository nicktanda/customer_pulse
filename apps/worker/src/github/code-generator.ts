/**
 * AI code generator — generates code changes from idea + repo context.
 * Ported from Rails CodeGenerator.
 */
import { callClaudeJson } from "../ai/call-claude.js";
import { findPathMismatches, type RepoContext } from "./repo-analyzer.js";

export interface FileChange {
  path: string;
  /** Required for "create" and "modify"; ignored for "delete". */
  content?: string;
  action: "create" | "modify" | "delete";
}

export interface CodeGenerationResult {
  files: FileChange[];
  summary: string;
  commit_message: string;
}

const MAX_VALIDATION_RETRIES = 2;
const DOC_ONLY_EXTENSIONS = new Set(["md", "mdx", "txt", "rst"]);

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

SHIP CODE, NOT DOCS (hard requirement):
- The PR MUST implement the feature with runnable code (\`.ts\`/\`.tsx\`/\`.js\`/\`.jsx\`/\`.css\`/\`.scss\`/\`.sql\`/\`.py\`/\`.go\`/\`.rb\`/\`.html\`, etc.).
- A response containing ONLY documentation files (\`.md\`/\`.mdx\`/\`.txt\`/\`.rst\`) is NOT acceptable. Writing a design doc when the idea calls for a feature is a failure mode — actually build it.
- Documentation may be included alongside code changes when it's directly part of the user-facing feature, but it cannot be the entire PR.

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

/**
 * True when every emitted file is documentation only — no runnable code.
 * Catches the failure mode where the model writes a design doc instead of
 * implementing the feature (PR #68 shipped a 319-line markdown spec under
 * `.claude/skills/...` and zero functional code).
 */
function isDocOnly(files: FileChange[]): boolean {
  if (files.length === 0) return false;
  return files.every((f) => {
    const ext = f.path.split(".").pop()?.toLowerCase() ?? "";
    return DOC_ONLY_EXTENSIONS.has(ext);
  });
}

export async function generateCode(
  ideaTitle: string,
  ideaDescription: string,
  implementationHints: string[],
  repoContext: RepoContext,
  // Optional progress hook — invoked at the start of each Claude attempt so
  // callers (e.g. pr-creator) can surface "attempt N of M" to the UI while
  // the underlying request is still in flight. A hung request used to look
  // identical to a healthy one for the full retry window.
  onAttempt?: (attempt: number, maxAttempts: number) => void | Promise<void>,
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

  // Self-validate the model's output against deterministic checks (path
  // mismatches + doc-only output) and retry on failure — the same model
  // gets told exactly what failed so it can correct on the next attempt.
  const maxAttempts = MAX_VALIDATION_RETRIES + 1;
  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    if (onAttempt) await onAttempt(attempt + 1, maxAttempts);
    const result = await callClaudeJson<CodeGenerationResult>({
      system: SYSTEM_PROMPT,
      user: retryFeedback ? `${baseUser}\n\n${retryFeedback}` : baseUser,
      maxTokens: 64000,
    });
    if (!result?.files?.length) return result;

    const docOnly = isDocOnly(result.files);
    const mismatches = findPathMismatches(result.files, repoContext);

    if (!docOnly && mismatches.length === 0) {
      if (attempt > 0) console.log(`[code-gen] validation passed after ${attempt} retr${attempt === 1 ? "y" : "ies"}`);
      return result;
    }

    if (attempt === MAX_VALIDATION_RETRIES) {
      console.warn(`[code-gen] validation still failed after ${MAX_VALIDATION_RETRIES} retries (docOnly=${docOnly}, mismatches=${mismatches.length}) — returning result for QA to flag`);
      return result;
    }

    const reasons: string[] = [];
    if (docOnly) reasons.push("docs-only");
    if (mismatches.length > 0) reasons.push(`${mismatches.length} path mismatch${mismatches.length === 1 ? "" : "es"}`);
    console.log(`[code-gen] validation failed (attempt ${attempt + 1}, ${reasons.join(", ")}), retrying with corrections`);

    const sections: string[] = [];
    if (docOnly) {
      sections.push([
        `## PRIOR ATTEMPT WAS DOCUMENTATION ONLY`,
        ``,
        `Every file in your previous response was a documentation file (\`.md\`/\`.mdx\`/\`.txt\`/\`.rst\`). The idea calls for an implementation; a design doc alone does not ship the feature.`,
        ``,
        `Re-emit with the actual code changes that build the feature (e.g. React components, route handlers, styles, tests). You may include documentation alongside code, but at least one runnable code file is required.`,
      ].join("\n"));
    }
    if (mismatches.length > 0) {
      sections.push([
        `## PRIOR ATTEMPT PLACED FILES AT WRONG PATHS`,
        ``,
        `Your previous response put these files outside the repo's existing layout:`,
        ...mismatches.map((m) => `- ${m}`),
        ``,
        `Re-emit ALL files with corrected paths under the allowed directory prefixes listed above. Do not return any file at the wrong path.`,
      ].join("\n"));
    }
    retryFeedback = sections.join("\n\n");
  }

  return null;
}
