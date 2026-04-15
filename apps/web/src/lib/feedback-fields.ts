import { FeedbackCategory, FeedbackPriority } from "@customer-pulse/db/client";

/** Map API / webhook string keys to the integer enums stored in Postgres. */
export function coerceCategory(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value in FeedbackCategory) {
    return FeedbackCategory[value as keyof typeof FeedbackCategory];
  }
  return FeedbackCategory.uncategorized;
}

export function coercePriority(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value in FeedbackPriority) {
    return FeedbackPriority[value as keyof typeof FeedbackPriority];
  }
  return FeedbackPriority.unset;
}
