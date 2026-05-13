import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import AccentColourProvider from "../AccentColourProvider";
import AccentColourPicker from "../AccentColourPicker";

// Mock CSS imports so Vitest doesn't choke on them
vi.mock("../../../accent-colour-picker.css", () => ({}));

// Provide a minimal localStorage stub
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Stub document.documentElement.setAttribute to track data-accent changes
const setAttributeSpy = vi.spyOn(
  typeof document !== "undefined" ? document.documentElement : { setAttribute: vi.fn() } as unknown as Element,
  "setAttribute"
);

describe("AccentColourPicker", () => {
  beforeEach(() => {
    localStorageMock.clear();
    setAttributeSpy.mockClear();
  });

  function renderPicker() {
    return render(
      <AccentColourProvider>
        <AccentColourPicker />
      </AccentColourProvider>
    );
  }

  it("renders a swatch for each palette entry", () => {
    const { getAllByRole } = renderPicker();
    const swatches = getAllByRole("radio");
    expect(swatches).toHaveLength(8);
  });

  it("marks indigo as selected by default", () => {
    const { getAllByRole } = renderPicker();
    const swatches = getAllByRole("radio");
    const indigo = swatches.find(
      (s) => s.getAttribute("aria-label") === "Indigo"
    );
    expect(indigo?.getAttribute("aria-checked")).toBe("true");
  });

  it("updates selection when a swatch is clicked", () => {
    const { getAllByRole } = renderPicker();
    const swatches = getAllByRole("radio");
    const rose = swatches.find(
      (s) => s.getAttribute("aria-label") === "Rose"
    )!;
    fireEvent.click(rose);
    expect(rose.getAttribute("aria-checked")).toBe("true");
    expect(localStorageMock.getItem("accentColour")).toBe("rose");
  });

  it("applies data-accent attribute when selection changes", () => {
    const { getAllByRole } = renderPicker();
    const swatches = getAllByRole("radio");
    const teal = swatches.find(
      (s) => s.getAttribute("aria-label") === "Teal"
    )!;
    fireEvent.click(teal);
    expect(setAttributeSpy).toHaveBeenCalledWith("data-accent", "teal");
  });

  it("keyboard navigation moves focus with ArrowRight", () => {
    const { getAllByRole } = renderPicker();
    const swatches = getAllByRole("radio");
    // Indigo (index 0) is selected; ArrowRight should move to Violet (index 1)
    fireEvent.keyDown(swatches[0], { key: "ArrowRight" });
    const violet = swatches.find(
      (s) => s.getAttribute("aria-label") === "Violet"
    )!;
    expect(violet.getAttribute("aria-checked")).toBe("true");
  });

  it("keyboard navigation wraps at the end", () => {
    const { getAllByRole } = renderPicker();
    const swatches = getAllByRole("radio");
    // Click the last swatch (Slate, index 7) first
    const slate = swatches.find(
      (s) => s.getAttribute("aria-label") === "Slate"
    )!;
    fireEvent.click(slate);
    // ArrowRight from last should wrap to first (Indigo)
    fireEvent.keyDown(slate, { key: "ArrowRight" });
    const indigo = swatches.find(
      (s) => s.getAttribute("aria-label") === "Indigo"
    )!;
    expect(indigo.getAttribute("aria-checked")).toBe("true");
  });
});
