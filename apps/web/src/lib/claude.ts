/**
 * Web-side Anthropic helper for Next.js server actions and route handlers.
 *
 * Mirrors apps/worker/src/ai/call-claude.ts but uses getRequestDb() (the
 * per-request Next.js DB pool) for the API key DB fallback instead of
 * the worker's long-lived connection pool.
 *
 * API key resolution order:
 *   1. ANTHROPIC_API_KEY environment variable
 *   2. Anthropic integration row in the DB (source_type 13, encrypted via Lockbox)
 */

import { eq } from "drizzle-orm";
import { getRequestDb } from "@/lib/db";
import { integrations } from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// ─── API key resolution ──────────────────────────────────────────────────────

/**
 * Resolves the Anthropic API key for use in web server actions.
 * Checks the environment variable first, then the DB integration row.
 */
async function resolveApiKey(): Promise<string | null> {
  const envKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (envKey) return envKey;

  const masterKey = process.env.LOCKBOX_MASTER_KEY?.trim();
  if (!masterKey) {
    console.error("[web/claude] LOCKBOX_MASTER_KEY not set — cannot decrypt Anthropic key from DB");
    return null;
  }

  try {
    const db = await getRequestDb();
    // source_type 13 = anthropic integration
    const rows = await db
      .select({ ciphertext: integrations.credentialsCiphertext })
      .from(integrations)
      .where(eq(integrations.sourceType, 13))
      .limit(1);

    if (!rows[0]?.ciphertext) {
      console.warn("[web/claude] No Anthropic integration found in DB — configure it in Settings");
      return null;
    }

    const decrypted = decryptCredentialsColumn(rows[0].ciphertext, masterKey);
    const creds = JSON.parse(decrypted) as { api_key?: string };
    return creds.api_key?.trim() ?? null;
  } catch (err) {
    console.error(`[web/claude] Failed to load API key from DB: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

export interface ClaudeWebResponse {
  text: string;
  ok: boolean;
}

/**
 * Makes a single Anthropic messages API call.
 * Returns { ok: false, text: "" } on any error so callers can degrade gracefully.
 */
export async function callClaudeWeb(options: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<ClaudeWebResponse> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    return { ok: false, text: "" };
  }

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
      console.error(`[web/claude] Anthropic error (${res.status}): ${json.error?.message}`);
      return { ok: false, text: "" };
    }

    const text = json.content?.find((c) => c.type === "text")?.text ?? "";
    return { ok: true, text };
  } catch (err) {
    console.error(`[web/claude] Fetch error: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, text: "" };
  }
}

/**
 * Calls Claude and parses the response as JSON.
 * Returns null if the call fails or the response is not valid JSON.
 *
 * Handles markdown fences (```json ... ```) that Claude sometimes wraps around JSON.
 */
export async function callClaudeJsonWeb<T>(options: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T | null> {
  const response = await callClaudeWeb(options);
  if (!response.ok || !response.text) {
    return null;
  }
  return parseJsonFromText<T>(response.text);
}

/**
 * Streams plain-text Claude output as SSE-style chunks for use in Next.js route handlers.
 * Returns null when the API key is unavailable so callers can return a 503.
 *
 * Caller pipes the returned ReadableStream into `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`.
 */
export async function callClaudeStreamWeb(options: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<ReadableStream<Uint8Array> | null> {
  const apiKey = await resolveApiKey();
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 2048,
      system: options.system,
      messages: [{ role: "user", content: options.user }],
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    console.error(`[web/claude] Stream open failed: ${res.status}`);
    return null;
  }

  // The Anthropic stream is already SSE — re-emit only the text deltas as a simpler "data: <text>\n\n" stream.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const evt of events) {
            const dataLine = evt.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const data = dataLine.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta" && parsed.delta.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`));
              }
            } catch { /* ignore non-JSON keepalives */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error(`[web/claude] Stream error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        controller.close();
      }
    },
  });
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

/**
 * Extracts JSON from a Claude response string.
 * Handles direct JSON, markdown fences, and truncated JSON.
 * Ported from the worker's call-claude.ts parseJsonFromText.
 */
function parseJsonFromText<T>(text: string): T | null {
  // Try direct parse first — Claude usually returns clean JSON
  try {
    return JSON.parse(text) as T;
  } catch { /* continue */ }

  // Strip ```json ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1]) as T;
    } catch { /* continue */ }
  }

  // Extract the first JSON object or array from the text
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch?.[1]) {
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch { /* try truncation fix */ }

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
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === "{") openBraces++;
    else if (char === "}") openBraces--;
    else if (char === "[") openBrackets++;
    else if (char === "]") openBrackets--;
  }

  if (openBraces === 0 && openBrackets === 0) return null;

  let result = text;
  if (inString) result += '"';
  while (openBrackets > 0) { result += "]"; openBrackets--; }
  while (openBraces > 0) { result += "}"; openBraces--; }

  return result;
}
