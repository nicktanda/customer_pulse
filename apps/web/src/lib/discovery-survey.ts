import { z } from "zod";

/**
 * Discovery "Survey" activity (type 2) — JSON stored in `ai_generated_content`.
 * Pure helpers: validation and export formatting (no React / server-only imports).
 */

export const SURVEY_QUESTION_TYPES = ["likert", "multiple_choice", "open_ended"] as const;
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export type SurveyQuestion = {
  question: string;
  type: SurveyQuestionType;
  options?: string[];
  /** When set with scale_max_label, shown for Likert instead of inferring from question text. */
  scale_min_label?: string;
  scale_max_label?: string;
};

export type SurveyContent = {
  questions: SurveyQuestion[];
  human_edited?: boolean;
};

/** DB payload when Claude output could not be parsed or failed validation. */
export type SurveyDraftErrorPayload = {
  _draft_error: true;
  error_kind: "json_parse" | "invalid_survey";
  detail: string;
  partial_raw?: string;
};

const questionSchema = z.object({
  question: z.string(),
  type: z.enum(SURVEY_QUESTION_TYPES),
  options: z.array(z.string()).optional(),
  scale_min_label: z.string().optional(),
  scale_max_label: z.string().optional(),
});

const surveyObjectSchema = z.object({
  questions: z.array(questionSchema),
  human_edited: z.boolean().optional(),
});

/**
 * True when the saved JSON is our error stub (show retry / regenerate UX).
 */
export function isSurveyDraftError(content: Record<string, unknown>): content is SurveyDraftErrorPayload {
  return content._draft_error === true;
}

/**
 * Likert should either carry explicit scale labels or mention a numeric range / agreement scale in prose.
 */
function likertHasScaleHint(q: SurveyQuestion): boolean {
  if (q.scale_min_label?.trim() && q.scale_max_label?.trim()) return true;
  const t = q.question.toLowerCase();
  return (
    (t.includes("1") && t.includes("5")) ||
    t.includes("strongly disagree") ||
    t.includes("strongly agree") ||
    t.includes("scale:") ||
    t.includes("1 =") ||
    t.includes("1=") ||
    t.includes("likert")
  );
}

/**
 * After Zod structural parse, enforce product rules: 5 questions, mix of types, sensible options.
 */
export function validateSurveyShape(parsed: unknown): { ok: true; data: SurveyContent } | { ok: false; reason: string } {
  const zod = surveyObjectSchema.safeParse(parsed);
  if (!zod.success) {
    return { ok: false, reason: "Survey JSON must be an object with a `questions` array." };
  }

  const { questions, human_edited } = zod.data;

  if (questions.length !== 5) {
    return { ok: false, reason: `Expected exactly 5 questions, got ${questions.length}.` };
  }

  let likert = 0;
  let openEnded = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    const n = i + 1;
    if (!q.question?.trim()) {
      return { ok: false, reason: `Question ${n} is empty.` };
    }
    if (q.type === "multiple_choice") {
      const opts = q.options?.filter((o) => o.trim()) ?? [];
      if (opts.length < 2) {
        return { ok: false, reason: `Question ${n} (multiple choice) needs at least 2 non-empty options.` };
      }
    }
    if (q.type === "likert") {
      if (!likertHasScaleHint(q)) {
        return {
          ok: false,
          reason: `Question ${n} (Likert) should name the scale in the text (e.g. 1 = … 5 = …) or set scale min/max labels.`,
        };
      }
      likert += 1;
    }
    if (q.type === "open_ended") {
      openEnded += 1;
    }
  }

  if (likert < 1) {
    return { ok: false, reason: "Include at least one Likert-scale question." };
  }
  if (openEnded < 1) {
    return { ok: false, reason: "Include at least one open-ended question." };
  }

  return {
    ok: true,
    data: {
      questions: questions.map((q) => ({
        question: q.question.trim(),
        type: q.type,
        ...(q.options?.length ? { options: q.options.map((o) => o.trim()).filter(Boolean) } : {}),
        ...(q.scale_min_label?.trim() ? { scale_min_label: q.scale_min_label.trim() } : {}),
        ...(q.scale_max_label?.trim() ? { scale_max_label: q.scale_max_label.trim() } : {}),
      })),
      ...(human_edited ? { human_edited: true } : {}),
    },
  };
}

/**
 * Human-readable export: numbered list, types, options, and Likert scale hints.
 */
export function serializeSurveyToText(content: SurveyContent): string {
  const lines: string[] = ["Survey (5 questions)", ""];
  content.questions.forEach((q, i) => {
    const num = i + 1;
    lines.push(`${num}. ${q.question}`);
    lines.push(`   Type: ${q.type.replace("_", " ")}`);
    if (q.type === "likert") {
      if (q.scale_min_label && q.scale_max_label) {
        lines.push(`   Scale: 1 = ${q.scale_min_label} … 5 = ${q.scale_max_label}`);
      } else {
        lines.push(`   Scale: 1–5 (see wording above)`);
      }
    }
    if (q.type === "multiple_choice" && q.options?.length) {
      lines.push("   Options:");
      q.options.forEach((o, j) => lines.push(`     ${String.fromCharCode(97 + j)}) ${o}`));
    }
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

/**
 * Markdown export for Notion / Confluence.
 */
export function serializeSurveyToMarkdown(content: SurveyContent): string {
  const lines: string[] = ["## Survey (5 questions)", ""];
  content.questions.forEach((q, i) => {
    const num = i + 1;
    lines.push(`### ${num}. ${q.question}`);
    lines.push("");
    lines.push(`- **Type:** ${q.type.replace("_", " ")}`);
    if (q.type === "likert") {
      if (q.scale_min_label && q.scale_max_label) {
        lines.push(`- **Scale:** 1 = ${q.scale_min_label} … 5 = ${q.scale_max_label}`);
      } else {
        lines.push(`- **Scale:** 1–5 (see wording above)`);
      }
    }
    if (q.type === "multiple_choice" && q.options?.length) {
      lines.push("- **Options:**");
      q.options.forEach((o) => lines.push(`  - ${o}`));
    }
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}
