import { describe, expect, it } from "vitest";
import {
  formatInterviewQuestionsForCopy,
  getInterviewGuideQuestions,
  isInterviewGuideDraftErrorRecord,
  isValidClaudeInterviewGuideResponse,
} from "./discovery-interview-guide";

describe("formatInterviewQuestionsForCopy", () => {
  it("numbers each line", () => {
    expect(
      formatInterviewQuestionsForCopy(["First?", " Second has spaces "]),
    ).toBe("1. First?\n2. Second has spaces");
  });
});

describe("getInterviewGuideQuestions", () => {
  it("returns null for draft error object", () => {
    expect(getInterviewGuideQuestions({ _interviewDraftError: true })).toBeNull();
  });

  it("returns string list when valid", () => {
    expect(getInterviewGuideQuestions({ questions: ["A?", "B?"] })).toEqual(["A?", "B?"]);
  });
});

describe("isInterviewGuideDraftErrorRecord", () => {
  it("detects marker", () => {
    expect(isInterviewGuideDraftErrorRecord({ _interviewDraftError: true })).toBe(true);
    expect(isInterviewGuideDraftErrorRecord({ questions: [] })).toBe(false);
  });
});

describe("isValidClaudeInterviewGuideResponse", () => {
  it("validates non-empty string array", () => {
    expect(isValidClaudeInterviewGuideResponse({ questions: ["x"] })).toBe(true);
    expect(isValidClaudeInterviewGuideResponse({ questions: [] })).toBe(false);
    expect(isValidClaudeInterviewGuideResponse({ questions: [""] })).toBe(false);
  });
});
