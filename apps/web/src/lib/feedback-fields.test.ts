import { describe, expect, it } from "vitest";
import { FeedbackCategory, FeedbackPriority } from "@customer-pulse/db/client";
import { coerceCategory, coercePriority } from "./feedback-fields";

/**
 * These helpers turn messy API input (strings or ints) into the integer enums
 * stored in Postgres. Tests lock that behavior so integrations do not silently break.
 */
describe("coerceCategory", () => {
  it("passes through valid integer enums", () => {
    expect(coerceCategory(FeedbackCategory.bug)).toBe(FeedbackCategory.bug);
  });

  it("maps known string keys to enum ints", () => {
    expect(coerceCategory("feature_request")).toBe(FeedbackCategory.feature_request);
  });

  it("defaults unknown strings and null to uncategorized", () => {
    expect(coerceCategory("not_a_real_category")).toBe(FeedbackCategory.uncategorized);
    expect(coerceCategory(null)).toBe(FeedbackCategory.uncategorized);
  });

  it("passes through any integer (even if not a known enum — DB may still store it)", () => {
    expect(coerceCategory(999)).toBe(999);
  });

  it("treats non-integer numbers like unknown input", () => {
    expect(coerceCategory(3.14)).toBe(FeedbackCategory.uncategorized);
  });
});

describe("coercePriority", () => {
  it("passes through valid integer enums", () => {
    expect(coercePriority(FeedbackPriority.p2)).toBe(FeedbackPriority.p2);
  });

  it("maps known string keys to enum ints", () => {
    expect(coercePriority("p1")).toBe(FeedbackPriority.p1);
  });

  it("defaults unknown values to unset", () => {
    expect(coercePriority("urgent!!!")).toBe(FeedbackPriority.unset);
    expect(coercePriority(3.14)).toBe(FeedbackPriority.unset);
  });
});
