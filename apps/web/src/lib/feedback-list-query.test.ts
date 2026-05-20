import { describe, expect, it } from "vitest";
import {
  feedbackListHref,
  parseFeedbackListViewFromParam,
  serializeFeedbackListQuery,
} from "./feedback-list-query";

describe("feedbackListHref", () => {
  it("uses Inbox as the default feedback view", () => {
    expect(feedbackListHref({})).toBe("/app/learn/feedback");
  });

  it("serializes the all-feedback archive view", () => {
    expect(feedbackListHref({ view: "all" })).toBe("/app/learn/feedback?view=all");
  });

  it("preserves archive view with filters, sort, and detail drawer state", () => {
    expect(
      serializeFeedbackListQuery({
        view: "all",
        category: "2",
        detail: 42,
        sort: "title",
      }),
    ).toBe("view=all&category=2&detail=42&sort=title");
  });
});

describe("parseFeedbackListViewFromParam", () => {
  it("accepts only the all-feedback archive mode", () => {
    expect(parseFeedbackListViewFromParam("all")).toBe("all");
    expect(parseFeedbackListViewFromParam("inbox")).toBeUndefined();
    expect(parseFeedbackListViewFromParam(undefined)).toBeUndefined();
  });
});
