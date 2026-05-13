import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ACCENT_COLOURS,
  DEFAULT_ACCENT,
  ACCENT_STORAGE_KEY,
  applyAccentColour,
  initAccentColour,
} from "../AccentColourPicker";

// ---------------------------------------------------------------------------
// Minimal DOM stubs (no jsdom dependency required)
// ---------------------------------------------------------------------------

const styleMap = new Map<string, string>();
const attributes = new Map<string, string>();

const mockRoot = {
  style: {
    setProperty: (prop: string, value: string) => styleMap.set(prop, value),
    getPropertyValue: (prop: string) => styleMap.get(prop) ?? "",
  },
  setAttribute: (attr: string, value: string) => attributes.set(attr, value),
  getAttribute: (attr: string) => attributes.get(attr) ?? null,
};

beforeEach(() => {
  styleMap.clear();
  attributes.clear();
  // Stub document.documentElement
  vi.stubGlobal("document", { documentElement: mockRoot });
});

// ---------------------------------------------------------------------------
// applyAccentColour
// ---------------------------------------------------------------------------

describe("applyAccentColour", () => {
  it("sets --colour-accent to the correct hex value for each swatch", () => {
    for (const colour of ACCENT_COLOURS) {
      styleMap.clear();
      applyAccentColour(colour.label);
      expect(styleMap.get("--colour-accent")).toBe(colour.value);
    }
  });

  it("sets the data-accent attribute on the root element", () => {
    applyAccentColour("teal");
    expect(attributes.get("data-accent")).toBe("teal");
  });

  it("sets --colour-accent-foreground for each swatch", () => {
    for (const colour of ACCENT_COLOURS) {
      styleMap.clear();
      applyAccentColour(colour.label);
      expect(styleMap.get("--colour-accent-foreground")).toBe(colour.foreground);
    }
  });

  it("does nothing for an unknown label", () => {
    // @ts-expect-error — deliberately passing invalid label
    applyAccentColour("nonexistent");
    expect(styleMap.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// initAccentColour
// ---------------------------------------------------------------------------

describe("initAccentColour", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
  });

  it("applies the stored colour when a valid label is in localStorage", () => {
    const storedLabel = "emerald";
    const storedColour = ACCENT_COLOURS.find((c) => c.label === storedLabel)!;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === ACCENT_STORAGE_KEY ? storedLabel : null),
    });

    initAccentColour();

    expect(styleMap.get("--colour-accent")).toBe(storedColour.value);
    expect(attributes.get("data-accent")).toBe(storedLabel);
  });

  it("falls back to DEFAULT_ACCENT when localStorage is empty", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
    });
    const defaultColour = ACCENT_COLOURS.find((c) => c.label === DEFAULT_ACCENT)!;

    initAccentColour();

    expect(styleMap.get("--colour-accent")).toBe(defaultColour.value);
    expect(attributes.get("data-accent")).toBe(DEFAULT_ACCENT);
  });

  it("falls back to DEFAULT_ACCENT when localStorage contains an unknown label", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "hot-pink",
    });
    const defaultColour = ACCENT_COLOURS.find((c) => c.label === DEFAULT_ACCENT)!;

    initAccentColour();

    expect(styleMap.get("--colour-accent")).toBe(defaultColour.value);
  });

  it("does nothing when window is undefined (SSR context)", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("localStorage", undefined);

    // Should not throw
    expect(() => initAccentColour()).not.toThrow();
    expect(styleMap.size).toBe(0);
  });
});
