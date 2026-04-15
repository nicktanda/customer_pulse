import { describe, expect, it } from "vitest";
import { secureCompare } from "./secure-compare";

/**
 * API keys and tokens must be compared in constant time so attackers cannot
 * guess secrets from timing differences. These tests document expected behavior.
 */
describe("secureCompare", () => {
  it("returns true for identical strings", () => {
    expect(secureCompare("same", "same")).toBe(true);
  });

  it("returns false when lengths differ (before timingSafeEqual)", () => {
    expect(secureCompare("short", "longer")).toBe(false);
  });

  it("returns false for same-length but different content", () => {
    expect(secureCompare("aaaa", "aaab")).toBe(false);
  });

  it("treats UTF-8 bytes correctly", () => {
    expect(secureCompare("café", "café")).toBe(true);
    expect(secureCompare("café", "cafe")).toBe(false);
  });
});
