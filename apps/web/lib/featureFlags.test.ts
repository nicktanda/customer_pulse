import { isFeatureEnabled } from "./featureFlags";

const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("isFeatureEnabled", () => {
  describe("accentColorPicker", () => {
    it('returns true when env var is "true"', () => {
      process.env.NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER = "true";
      expect(isFeatureEnabled("accentColorPicker")).toBe(true);
    });

    it('returns true when env var is "1"', () => {
      process.env.NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER = "1";
      expect(isFeatureEnabled("accentColorPicker")).toBe(true);
    });

    it('returns false when env var is "false"', () => {
      process.env.NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER = "false";
      expect(isFeatureEnabled("accentColorPicker")).toBe(false);
    });

    it("returns false when env var is not set", () => {
      delete process.env.NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER;
      expect(isFeatureEnabled("accentColorPicker")).toBe(false);
    });

    it('returns false when env var is "0"', () => {
      process.env.NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER = "0";
      expect(isFeatureEnabled("accentColorPicker")).toBe(false);
    });

    it("returns false when env var is an empty string", () => {
      process.env.NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER = "";
      expect(isFeatureEnabled("accentColorPicker")).toBe(false);
    });
  });
});
