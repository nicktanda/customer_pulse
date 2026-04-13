/**
 * Shared Anthropic HTTP helper for AI pipeline jobs.
 * Direct HTTP calls (no SDK) — matches the pattern in reporting-nl.ts.
 */

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const RATE_LIMIT_MS = 500;

let lastCallTime = 0;

async function rateLimitSleep(): Promise<void> {
  const elapsed = Date.now() - lastCallTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastCallTime = Date.now();
}

export interface ClaudeResponse {
  text: string;
  ok: boolean;
}

export async function callClaude(options: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { text: "", ok: false };
  }

  await rateLimitSleep();

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 4096,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
      }),
    });

    const json = (await res.json()) as {
      content?: { type: string; text?: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      const errMsg = json.error?.message ?? `HTTP ${res.status}`;
      console.error(`[ai] Anthropic error: ${errMsg}`);
      return { text: "", ok: false };
    }

    const text = json.content?.find((c) => c.type === "text")?.text ?? "";
    return { text, ok: true };
  } catch (err) {
    console.error(`[ai] Anthropic fetch error: ${err instanceof Error ? err.message : String(err)}`);
    return { text: "", ok: false };
  }
}

export async function callClaudeJson<T>(options: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T | null> {
  const response = await callClaude(options);
  if (!response.ok || !response.text) {
    return null;
  }

  const parsed = parseJsonFromText<T>(response.text);
  return parsed;
}

/**
 * Extract JSON from Claude's response — handles markdown fences and truncated JSON.
 * Ported from Rails BaseAnalyzer#parse_json_response + fix_truncated_json.
 */
export function parseJsonFromText<T>(text: string): T | null {
  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch { /* continue */ }

  // Strip markdown fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1]) as T;
    } catch { /* continue */ }
  }

  // Try extracting JSON array or object
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch?.[1]) {
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch { /* try truncation fix */ }

    // Fix truncated JSON by closing brackets
    const fixed = fixTruncatedJson(jsonMatch[1]);
    if (fixed) {
      try {
        return JSON.parse(fixed) as T;
      } catch { /* give up */ }
    }
  }

  return null;
}

function fixTruncatedJson(text: string): string | null {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") openBraces++;
    else if (char === "}") openBraces--;
    else if (char === "[") openBrackets++;
    else if (char === "]") openBrackets--;
  }

  if (openBraces === 0 && openBrackets === 0) return null; // Not truncated

  // Close any open string
  let result = text;
  if (inString) result += '"';

  // Close brackets/braces
  while (openBrackets > 0) {
    result += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    result += "}";
    openBraces--;
  }

  return result;
}
