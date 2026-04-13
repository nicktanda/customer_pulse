/**
 * AI code generator — generates code changes from idea + repo context.
 * Ported from Rails CodeGenerator.
 */
import { callClaudeJson } from "../ai/call-claude.js";
import type { RepoContext } from "./repo-analyzer.js";

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
- Keep changes focused and minimal`;

export async function generateCode(
  ideaTitle: string,
  ideaDescription: string,
  implementationHints: string[],
  repoContext: RepoContext,
): Promise<CodeGenerationResult | null> {
  const contextStr = [
    `Tech Stack: ${JSON.stringify(repoContext.techStack)}`,
    `Structure: Top dirs: ${JSON.stringify((repoContext.structure as { topDirs?: string[] }).topDirs ?? [])}`,
    `Conventions: ${JSON.stringify(repoContext.conventions)}`,
    `Sample files: ${JSON.stringify(((repoContext.structure as { sampleFiles?: string[] }).sampleFiles ?? []).slice(0, 20))}`,
  ].join("\n");

  const hintsStr = implementationHints.length > 0
    ? `\nImplementation hints:\n${implementationHints.map((h) => `- ${h}`).join("\n")}`
    : "";

  const result = await callClaudeJson<CodeGenerationResult>({
    system: SYSTEM_PROMPT,
    user: `Repository context:\n${contextStr}\n\nIdea: "${ideaTitle}"\n${ideaDescription}${hintsStr}`,
    maxTokens: 8192,
  });

  return result;
}
