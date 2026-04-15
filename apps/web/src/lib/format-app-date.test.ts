import { describe, expect, it } from "vitest";
import { formatAppDate, formatAppDateTime } from "./format-app-date";

/**
 * UI date helpers: we only assert stable edge cases here because
 * `toLocaleString` output depends on the machine timezone/locale.
 */
describe("formatAppDateTime", () => {
  it("shows an em dash for missing dates", () => {
    expect(formatAppDateTime(null)).toBe("—");
    expect(formatAppDateTime(undefined)).toBe("—");
  });

  it("returns a non-empty string for a real Date", () => {
    const s = formatAppDateTime(new Date("2024-06-15T12:00:00.000Z"));
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(4);
  });
});

describe("formatAppDate", () => {
  it("shows an em dash for missing dates", () => {
    expect(formatAppDate(null)).toBe("—");
  });

  it("returns a non-empty string for a real Date", () => {
    const s = formatAppDate(new Date("2024-06-15T12:00:00.000Z"));
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(4);
  });
});
