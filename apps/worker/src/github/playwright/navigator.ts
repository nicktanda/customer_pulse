/**
 * AI-driven navigation for the playwright QA reviewer.
 *
 * Workflow:
 *  1. `planNavigation` — Claude proposes a click-through sequence to reach the
 *     feature, given the idea + PR diff. It MUST use UI affordances (clicks /
 *     fills against selectors), never direct URLs. If it can't reason out a
 *     route, the plan comes back empty and that's reported as a hard fail.
 *  2. `executeNavigation` — playwright executes each step against the running
 *     dev server. After every step (and on failure) we snapshot a screenshot,
 *     DOM HTML, and any console errors.
 *  3. `verifyVisually` — Claude looks at the final screenshot(s) + the original
 *     idea and decides whether the feature is actually visible/usable.
 */
import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import { callClaudeJson, callClaudeWithImages, parseJsonFromText } from "../../ai/call-claude.js";
import type { AuthCookie } from "./lifecycle.js";

export interface NavStep {
  action: "click" | "fill" | "wait";
  /** Playwright selector. Accepts CSS, `text=...`, `role=...`, etc. */
  selector?: string;
  /** Required for `fill`. */
  value?: string;
  /** Required for `wait` — ms to wait, OR a selector to wait for. */
  waitFor?: string | number;
  description: string;
}

export interface NavigationPlan {
  plan: NavStep[];
  /** One-sentence description of what should be visible at the end. */
  expected: string;
}

export interface ExecutedStep {
  step: NavStep;
  ok: boolean;
  /** Error message if the step failed (e.g. selector not found). */
  error?: string;
  /** PNG screenshot taken after the step (or at the point of failure). */
  screenshotBase64: string;
  url: string;
}

export interface NavigationResult {
  startedAt: string;
  finishedAt: string;
  finalUrl: string;
  steps: ExecutedStep[];
  consoleErrors: string[];
  /** Lowercased innerText of <body> at end — used for cheap keyword checks. */
  finalBodyText: string;
  reachedEnd: boolean;
}

export interface VisualVerdict {
  visible: boolean;
  /** Specific, actionable findings — used by the QA reviewer as evidence. */
  findings: string[];
  explanation: string;
}

// ===========================================================================
// 1) Plan
// ===========================================================================

const PLAN_SYSTEM = `You are a manual QA tester planning how to reach a newly-built feature in a web app via the UI.

You will receive:
- An "idea" describing the feature
- The PR diff that supposedly implements it
- A short navigation hint describing the app's main IA (sidebar links, settings entry points, etc.)

Plan a sequence of UI interactions that, starting at the app's home page after login, navigates to the feature using ONLY clicks, fills, and waits — NEVER direct URL entry. The whole point of this check is to catch features that exist in the codebase but are not reachable by a real user clicking through the app.

Rules:
- Each step must reference a concrete playwright selector. Prefer in order:
  - \`role=...\` (e.g. \`role=link[name="Settings"]\`)
  - \`text=...\` (exact-match text content)
  - CSS selector (e.g. \`a[href="/app/settings"]\` — only if the link is visible in the rendered DOM)
- Do not invent a route or selector that is not visible in the diff or implied by the navigation hint. If you can't see a path, return an empty plan and a one-sentence \`expected\` like "feature should be reachable via the settings page" — empty plan = the QA reviewer will fail the PR for unreachability.
- Keep the plan short — typically 1-4 steps. The goal is to LAND on the feature, not interact with every control.
- \`expected\` is one sentence describing what a human looking at the final screen should see.

Return ONLY a JSON object:
{
  "plan": [
    { "action": "click", "selector": "role=link[name=\\"Settings\\"]", "description": "Open the Settings page from the sidebar" },
    { "action": "wait", "waitFor": "text=Accent colour", "description": "Wait for the accent colour section to render" }
  ],
  "expected": "An accent colour picker section is visible on the settings page with a palette of swatches and a custom hex input."
}`;

export async function planNavigation(
  idea: { title: string; description: string },
  diff: string,
  navigationHint: string,
): Promise<NavigationPlan | null> {
  const truncatedDiff = diff.length > 25_000 ? diff.slice(0, 25_000) + "\n... (truncated)" : diff;
  const result = await callClaudeJson<NavigationPlan>({
    system: PLAN_SYSTEM,
    user: [
      "## Idea",
      `**${idea.title}**`,
      idea.description,
      "",
      "## Navigation hint",
      navigationHint,
      "",
      "## PR diff",
      "```diff",
      truncatedDiff,
      "```",
    ].join("\n"),
    maxTokens: 2048,
  });
  return result;
}

// ===========================================================================
// 2) Execute
// ===========================================================================

export async function executeNavigation(opts: {
  baseUrl: string;
  authCookie: AuthCookie;
  plan: NavigationPlan;
}): Promise<NavigationResult> {
  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  // Inject the minted session cookie so we land authenticated.
  const cookieUrl = new URL(opts.baseUrl);
  await context.addCookies([
    {
      name: opts.authCookie.name,
      value: opts.authCookie.value,
      domain: cookieUrl.hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

  const startedAt = new Date().toISOString();
  const steps: ExecutedStep[] = [];
  let reachedEnd = true;

  try {
    // Land on the app home — the AI was told to assume this starting point.
    await page.goto(`${opts.baseUrl}/app`, { waitUntil: "networkidle", timeout: 30_000 });

    for (const step of opts.plan.plan) {
      const executed = await runStep(page, step);
      steps.push(executed);
      if (!executed.ok) {
        reachedEnd = false;
        break;
      }
    }

    const finalUrl = page.url();
    const finalBodyText = (await page.evaluate(() => document.body?.innerText ?? "")).toLowerCase();
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      finalUrl,
      steps,
      consoleErrors,
      finalBodyText,
      reachedEnd,
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function runStep(page: Page, step: NavStep): Promise<ExecutedStep> {
  const url = page.url();
  try {
    if (step.action === "click") {
      if (!step.selector) throw new Error("click step missing selector");
      await page.locator(step.selector).first().click({ timeout: 5_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    } else if (step.action === "fill") {
      if (!step.selector) throw new Error("fill step missing selector");
      await page.locator(step.selector).first().fill(step.value ?? "", { timeout: 5_000 });
    } else if (step.action === "wait") {
      if (typeof step.waitFor === "number") {
        await page.waitForTimeout(step.waitFor);
      } else if (typeof step.waitFor === "string") {
        await page.locator(step.waitFor).first().waitFor({ timeout: 10_000 });
      } else {
        throw new Error("wait step missing waitFor");
      }
    }
    const buf = await page.screenshot({ fullPage: false });
    return { step, ok: true, screenshotBase64: buf.toString("base64"), url: page.url() };
  } catch (err) {
    const buf = await page.screenshot({ fullPage: false }).catch(() => Buffer.alloc(0));
    return {
      step,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      screenshotBase64: buf.toString("base64"),
      url,
    };
  }
}

// ===========================================================================
// 3) Visually verify
// ===========================================================================

const VERIFY_SYSTEM = `You are a manual QA tester reviewing screenshots of a feature that was just navigated to in the browser.

You will receive:
- The original idea/feature description
- One or more screenshots from a recorded navigation
- The expected end-state (one sentence)
- Any console errors captured during the navigation
- Whether every navigation step succeeded

Your job is to verdict whether the feature is actually visible and usable in the final screen — not whether code for it exists, but whether a human user would now see and be able to interact with it. Be strict:

- If a navigation step failed (selector not found, timeout), the feature is NOT reachable — return visible: false.
- If the final screenshot shows the navigated page but the feature itself (e.g. the new picker, the new button, the new section) is missing or hidden behind a flag, return visible: false with a finding explaining what's missing.
- If the page renders correctly with the feature clearly present, return visible: true.

Return ONLY a JSON object:
{
  "visible": true | false,
  "findings": ["specific, actionable observation", ...],
  "explanation": "one or two sentences explaining your verdict"
}`;

export async function verifyVisually(
  idea: { title: string; description: string },
  plan: NavigationPlan,
  result: NavigationResult,
): Promise<VisualVerdict> {
  // Pick at most the last 3 step screenshots — they show the end state and
  // any failure context. Sending all of them is fine but adds latency for
  // no information gain on long plans.
  const recentSteps = result.steps.slice(-3);
  const images = recentSteps.map((s, idx) => ({
    mediaType: "image/png" as const,
    base64: s.screenshotBase64,
    caption: `### Step ${result.steps.length - recentSteps.length + idx + 1}: ${s.step.description} (${s.ok ? "ok" : "FAILED: " + (s.error ?? "unknown")})`,
  }));

  const consoleErrSection = result.consoleErrors.length
    ? result.consoleErrors.slice(0, 20).map((e) => `- ${e}`).join("\n")
    : "_(none)_";

  const response = await callClaudeWithImages({
    system: VERIFY_SYSTEM,
    user: [
      "## Idea",
      `**${idea.title}**`,
      idea.description,
      "",
      "## Expected end state",
      plan.expected,
      "",
      `## Navigation summary`,
      `- reached_end: ${result.reachedEnd}`,
      `- final_url: ${result.finalUrl}`,
      `- total_steps: ${result.steps.length}`,
      `- failed_step: ${result.steps.find((s) => !s.ok)?.step.description ?? "(none)"}`,
      "",
      "## Console errors during navigation",
      consoleErrSection,
      "",
      "Respond with ONLY the JSON object — no preamble.",
    ].join("\n"),
    images,
    maxTokens: 1024,
  });

  if (!response.ok || !response.text) {
    return {
      visible: false,
      findings: ["AI visual verifier failed to respond — could not assess reachability."],
      explanation: "No verdict available; treat as unverified.",
    };
  }
  const parsed = parseJsonFromText<VisualVerdict>(response.text);
  if (!parsed) {
    return {
      visible: false,
      findings: ["AI visual verifier returned unparseable JSON."],
      explanation: "No verdict available; treat as unverified.",
    };
  }
  return parsed;
}
