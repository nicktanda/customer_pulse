import { describe, expect, it } from "vitest";
import {
  isSurveyDraftError,
  serializeSurveyToMarkdown,
  serializeSurveyToText,
  validateSurveyShape,
  type SurveyContent,
} from "./discovery-survey";

const validSurvey: SurveyContent = {
  questions: [
    {
      question: "How satisfied are you? (1 = not at all, 5 = very satisfied)",
      type: "likert",
    },
    {
      question: "What would you improve?",
      type: "open_ended",
    },
    {
      question: "Pick a region",
      type: "multiple_choice",
      options: ["NA", "EU", "APAC"],
    },
    {
      question: "Rate ease of use (1 = strongly disagree … 5 = strongly agree that it is easy)",
      type: "likert",
    },
    {
      question: "Preferred channel?",
      type: "multiple_choice",
      options: ["Email", "Chat"],
    },
  ],
};

describe("validateSurveyShape", () => {
  it("accepts a valid 5-question mix", () => {
    const r = validateSurveyShape(validSurvey);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.questions).toHaveLength(5);
  });

  it("rejects wrong count", () => {
    const r = validateSurveyShape({ questions: validSurvey.questions.slice(0, 4) });
    expect(r.ok).toBe(false);
  });

  it("rejects missing open-ended", () => {
    const bad = {
      questions: validSurvey.questions.map((q) =>
        q.type === "open_ended" ? { ...q, type: "multiple_choice" as const, options: ["a", "b"] } : q,
      ),
    };
    const r = validateSurveyShape(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/open-ended/i);
  });

  it("accepts Likert with explicit scale labels", () => {
    const r = validateSurveyShape({
      questions: [
        { question: "Q1", type: "likert", scale_min_label: "Low", scale_max_label: "High" },
        { question: "Q2", type: "open_ended" },
        { question: "Q3", type: "multiple_choice", options: ["a", "b"] },
        { question: "Q4", type: "multiple_choice", options: ["x", "y"] },
        { question: "Q5 (1 to 5)", type: "likert" },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

describe("serializeSurveyToText", () => {
  it("includes numbering and options", () => {
    const s = serializeSurveyToText(validSurvey);
    expect(s).toContain("1.");
    expect(s).toContain("Type: multiple choice");
    expect(s).toContain("a)");
  });
});

describe("serializeSurveyToMarkdown", () => {
  it("uses headings and bullet options", () => {
    const s = serializeSurveyToMarkdown(validSurvey);
    expect(s).toContain("## Survey");
    expect(s).toContain("### 1.");
    expect(s).toContain("- **Options:**");
  });
});

describe("isSurveyDraftError", () => {
  it("detects error stub", () => {
    expect(isSurveyDraftError({ _draft_error: true, error_kind: "json_parse", detail: "x" })).toBe(true);
    expect(isSurveyDraftError({ questions: [] })).toBe(false);
  });
});
