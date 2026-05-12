import { isAccentColourEnabled, AB_BUCKET_STORAGE_KEY } from "./accent-colour-feature-flag";

describe("isAccentColourEnabled", () => {
  const originalEnv = process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR;

  beforeEach(() => {
    const store: Record<string, string> = {};
    jest.spyOn(Storage.prototype, "getItem").mockImplementation((k) => store[k] ?? null);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => { store[k] = v; });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR;
    } else {
      process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR = originalEnv;
    }
  });

  it('returns true when flag is "true"', () => {
    process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR = "true";
    expect(isAccentColourEnabled()).toBe(true);
  });

  it('returns false when flag is "false"', () => {
    process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR = "false";
    expect(isAccentColourEnabled()).toBe(false);
  });

  it('returns false when flag is unset', () => {
    delete process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR;
    expect(isAccentColourEnabled()).toBe(false);
  });

  it('returns false for A/B bucket "a"', () => {
    process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR = "ab";
    jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation((k) => (k === AB_BUCKET_STORAGE_KEY ? "a" : null));
    expect(isAccentColourEnabled()).toBe(false);
  });

  it('returns true for A/B bucket "b"', () => {
    process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR = "ab";
    jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation((k) => (k === AB_BUCKET_STORAGE_KEY ? "b" : null));
    expect(isAccentColourEnabled()).toBe(true);
  });

  it('assigns a stable bucket and persists it to localStorage in A/B mode', () => {
    process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR = "ab";
    const store: Record<string, string> = {};
    jest.spyOn(Storage.prototype, "getItem").mockImplementation((k) => store[k] ?? null);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => { store[k] = v; });

    // First call – bucket should be written
    const first = isAccentColourEnabled();
    const storedBucket = store[AB_BUCKET_STORAGE_KEY];
    expect(["a", "b"]).toContain(storedBucket);

    // Second call – same result because the bucket is now in the store
    const second = isAccentColourEnabled();
    expect(second).toBe(first);
  });
});
