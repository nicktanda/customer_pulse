import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ACCENT_COLOURS,
  DEFAULT_ACCENT,
  ACCENT_STORAGE_KEY,
  getStoredAccentColour,
  applyAccentColour,
  initAccentColour,
  type AccentColourLabel,
} from "../AccentColourPicker";

// ---------------------------------------------------------------------------
// Minimal DOM stubs (no jsdom required)
// ---------------------------------------------------------------------------

function makeRootStub() {
  const attrs: Record<string, string> = {};
  const styles: Record<string, string> = {};
  return {
    setAttribute: (k: string, v: string) => { attrs[k] = v; },
    getAttribute: (k: string) => attrs[k] ?? null,
    style: {
      setProperty: (k: string, v: string) => { styles[k] = v; },
      getPropertyValue: (k: string) => styles[k] ?? "",
    },
    _attrs: attrs,
    _styles: styles,
  };
}

// ---------------------------------------------------------------------------
// getStoredAccentColour
// ---------------------------------------------------------------------------

describe("getStoredAccentColour", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it("returns DEFAULT_ACCENT when nothing is stored", () => {
    expect(getStoredAccentColour()).toBe(DEFAULT_ACCENT);
  });

  it("returns the stored value when it is a valid label", () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, "rose");
    expect(getStoredAccentColour()).toBe("rose");
  });

  it("returns DEFAULT_ACCENT for an unrecognised stored value", () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, "totally-made-up");
    expect(getStoredAccentColour()).toBe(DEFAULT_ACCENT);
  });

  it("returns DEFAULT_ACCENT when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(getStoredAccentColour()).toBe(DEFAULT_ACCENT);
  });
});

// ---------------------------------------------------------------------------
// applyAccentColour
// ---------------------------------------------------------------------------

describe("applyAccentColour", () => {
  it("sets data-accent attribute and CSS custom properties on documentElement", () => {
    const root = makeRootStub();
    vi.stubGlobal("document", { documentElement: root });

    applyAccentColour("rose");

    expect(root._attrs["data-accent"]).toBe("rose");
    const roseColour = ACCENT_COLOURS.find((c) => c.label === "rose")!;
    expect(root._styles["--colour-accent"]).toBe(roseColour.value);
    expect(root._styles["--colour-accent-foreground"]).toBe(roseColour.foreground);
  });

  it("does nothing for an unrecognised label", () => {
    const root = makeRootStub();
    vi.stubGlobal("document", { documentElement: root });

    applyAccentColour("unknown" as AccentColourLabel);

    expect(root._attrs["data-accent"]).toBeUndefined();
  });

  it("applies all 8 palette entries without throwing", () => {
    const root = makeRootStub();
    vi.stubGlobal("document", { documentElement: root });

    for (const colour of ACCENT_COLOURS) {
      expect(() => applyAccentColour(colour.label)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// initAccentColour
// ---------------------------------------------------------------------------

describe("initAccentColour", () => {
  it("is a no-op when window is undefined (SSR guard)", () => {
    vi.stubGlobal("window", undefined);
    // Should not throw
    expect(() => initAccentColour()).not.toThrow();
  });

  it("applies the stored accent colour when window is defined", () => {
    const store: Record<string, string> = { [ACCENT_STORAGE_KEY]: "emerald" };
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
    });
    const root = makeRootStub();
    vi.stubGlobal("document", { documentElement: root });

    initAccentColour();

    expect(root._attrs["data-accent"]).toBe("emerald");
  });

  it("falls back to DEFAULT_ACCENT when nothing is stored", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => null });
    const root = makeRootStub();
    vi.stubGlobal("document", { documentElement: root });

    initAccentColour();

    expect(root._attrs["data-accent"]).toBe(DEFAULT_ACCENT);
  });
});

// ---------------------------------------------------------------------------
// Palette integrity
// ---------------------------------------------------------------------------

describe("ACCENT_COLOURS palette", () => {
  it("contains exactly 8 entries", () => {
    expect(ACCENT_COLOURS).toHaveLength(8);
  });

  it("every entry has a non-empty name, value, label, and foreground", () => {
    for (const colour of ACCENT_COLOURS) {
      expect(colour.name.length).toBeGreaterThan(0);
      expect(colour.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colour.label.length).toBeGreaterThan(0);
      expect(colour.foreground).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
    }
  });

  it("all labels are unique", () => {
    const labels = ACCENT_COLOURS.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("DEFAULT_ACCENT is present in the palette", () => {
    expect(ACCENT_COLOURS.some((c) => c.label === DEFAULT_ACCENT)).toBe(true);
  });
});
