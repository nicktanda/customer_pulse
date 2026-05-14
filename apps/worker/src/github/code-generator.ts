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
- Do NOT invent new top-level directories. If you think a new subtree is genuinely needed, place it under an existing prefix instead.

WIRE THE FEATURE END-TO-END (hard requirement):
A feature is not done when its UI renders. It is done when changing the UI's value visibly changes the product. Every value the user can set must have a real consumer downstream of where it's written. Before returning, mentally trace the data flow: user picks/clicks/types → value is stored (state/context/localStorage/DB) → SOMETHING ELSE in the app reads that value and behaves differently. If you can't name the consumer, the feature is incomplete.

Concrete patterns to AVOID — every one of these has shipped to this repo and produced a "feature exists but does nothing" merge:

- **CSS custom property with no readers.** If your code calls \`document.documentElement.style.setProperty('--accent-colour', ...)\` (or similar), at least one selector outside the new component's own CSS MUST read \`var(--accent-colour)\`. For colour/theme features in this repo, that means aliasing the relevant Bootstrap variables (\`--bs-primary\`, \`--bs-link-color\`, etc.) and/or updating shared button/link/focus styles in \`globals.css\`. A picker that only restyles its own swatches is a no-op.
- **React Context provider with no consumer.** If you add \`<XProvider>\` wrapping the app, at least one rendered component must call \`useX()\` and use the value to change its output. Otherwise the provider is dead weight.
- **Server action / API route with no UI trigger.** If you define a server action or route handler, the diff must also include the form/button/effect that calls it. An exported action with no caller never runs.
- **DB column / preference / setting with no read site.** If you add a new column to a DB row or a new field to a preferences blob, find the place(s) that should branch on it and update them. Storing a value that nothing checks is the same as not storing it.
- **Toggle/picker/setting whose only effect is on the toggle/picker/setting itself.** The "selected" indicator changing colour is not "user impact". Real user impact = something OUTSIDE the configuration surface changes when the value changes.

When the feature is a configuration/personalisation surface (theme, accent, density, layout choices, notification prefs, etc.), explicitly include the wire-up: the styles, components, or behaviour that depend on the configured value. If the idea is "let users pick an accent colour", the PR must include both the picker AND the styles that respond to it. Ship the entire vertical slice.

NO FEATURE FLAGS (hard requirement):
- DO NOT wrap the new feature in a \`process.env.NEXT_PUBLIC_*\`, \`process.env.FEATURE_*\`, or any similar environment-variable gate.
- DO NOT introduce a constant like \`ACCENT_COLOUR_ENABLED\`, \`FEATURE_ENABLED\`, \`isXEnabled\`, etc. that defaults to \`false\` and short-circuits rendering.
- DO NOT add conditional \`return null\` / hidden-render guards based on env vars or hardcoded booleans.
- DO NOT add JSX wrappers like \`{process.env.NEXT_PUBLIC_X === "true" ? <Section /> : null}\` around the user-facing surface.
- The idea is to SHIP the feature so users can see and use it. A default-disabled flag means the user clicked Generate-PR, the loop merged a PR, and yet nothing is visible — this has happened four times in a row on accent-colour PRs. STOP doing it.
- If you genuinely think the feature is risky to ship without a flag, ship it without one anyway. Risk-gating is the human reviewer's call, not yours.
- The ONLY case where an env var is acceptable is when the idea EXPLICITLY asks for one (e.g. "add a kill switch for X" or "make Y opt-in"). In that case, document it in \`.env.example\` and default it to ON unless the idea says otherwise.`;

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

/**
 * Deterministically rewrites files whose paths land outside any existing
 * repo prefix. For each bad path, finds a sibling directory under the
 * deepest valid parent that already contains files of the same extension
 * and moves the file there. Returns the rewritten file list plus a count
 * of how many were changed.
 *
 * Triggered as a last resort when the model emits the same path-mismatch
 * across all validation retries — the model is clearly not going to fix it
 * itself, and landing the bad path will only stall the review loop.
 */
function relocateMismatchedPaths(
  files: FileChange[],
  repoContext: RepoContext,
): { files: FileChange[]; changed: number } {
  const structure = repoContext.structure as { existingDirs?: string[]; dirsByExtension?: Record<string, string[]> };
  const existing = new Set(structure.existingDirs ?? []);
  const dirsByExt = structure.dirsByExtension ?? {};
  if (existing.size === 0) return { files, changed: 0 };

  let changed = 0;
  const rewritten = files.map((f) => {
    if (f.action !== "create") return f;
    const parts = f.path.split("/");
    if (parts.length < 3) return f;

    // Find the deepest existing parent prefix.
    let lastValidDepth = 0;
    for (let depth = parts.length - 1; depth >= 1; depth--) {
      const prefix = parts.slice(0, depth).join("/");
      if (existing.has(prefix)) {
        lastValidDepth = depth;
        break;
      }
    }
    if (lastValidDepth === parts.length - 1) return f; // parent prefix is already valid

    const validParent = parts.slice(0, lastValidDepth).join("/");
    const filename = parts[parts.length - 1] ?? "";
    const ext = filename.split(".").pop()?.toLowerCase();
    if (!ext || ext === filename) return f;

    // Pick a sibling directory under validParent that already contains
    // files of the same extension. Prefer the shortest match (closest to
    // the root, most idiomatic).
    const candidates = (dirsByExt[ext] ?? [])
      .filter((d) => d.startsWith(validParent + "/") || d === validParent)
      .sort((a, b) => a.length - b.length);
    const target = candidates[0];
    if (!target) return f;

    const newPath = `${target}/${filename}`;
    if (newPath === f.path) return f;
    changed++;
    return { ...f, path: newPath };
  });
  return { files: rewritten, changed };
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
      // Last attempt still failed. Before giving up, try to deterministically
      // relocate any path-mismatched files to a known-good sibling prefix.
      // The model has repeatedly emitted the same bad path after being told
      // it's wrong — fall back to a code-level rewrite rather than landing
      // the bad path in the PR for QA to keep flagging forever.
      if (mismatches.length > 0) {
        const relocated = relocateMismatchedPaths(result.files, repoContext);
        if (relocated.changed > 0) {
          const remaining = findPathMismatches(relocated.files, repoContext);
          if (remaining.length === 0) {
            console.warn(`[code-gen] deterministically relocated ${relocated.changed} mismatched path(s) after retries exhausted`);
            return { ...result, files: relocated.files };
          }
          console.warn(`[code-gen] partially relocated ${relocated.changed} path(s) but ${remaining.length} mismatch(es) still present — returning anyway`);
          return { ...result, files: relocated.files };
        }
      }
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
