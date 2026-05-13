import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import React from "react";
import AccentColourProvider, {
  useAccentColour,
  ACCENT_PALETTE,
  AccentColour,
} from "../AccentColourProvider";

// A simple consumer component for testing the context
function Consumer() {
  const { accent, setAccent } = useAccentColour();
  return (
    <div>
      <span data-testid="accent">{accent}</span>
      <button
        data-testid="set-violet"
        onClick={() => setAccent("violet" as AccentColour)}
      >
        Set Violet
      </button>
    </div>
  );
}

describe("AccentColourProvider", () => {
  beforeEach(() => {
    // Reset localStorage and html attribute before each test
    localStorage.clear();
    document.documentElement.removeAttribute("data-accent");
    vi.restoreAllMocks();
  });

  it("renders children and provides default accent (indigo)", () => {
    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );
    // After mount the useEffect sets the accent from localStorage (empty → default)
    expect(getByTestId("accent").textContent).toBe("indigo");
  });

  it("applies data-accent attribute to <html> on mount", () => {
    render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );
    expect(document.documentElement.getAttribute("data-accent")).toBe("indigo");
  });

  it("restores accent from localStorage on mount", () => {
    localStorage.setItem("accentColour", "rose");
    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );
    expect(getByTestId("accent").textContent).toBe("rose");
    expect(document.documentElement.getAttribute("data-accent")).toBe("rose");
  });

  it("ignores invalid localStorage values and falls back to default", () => {
    localStorage.setItem("accentColour", "hotpink");
    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );
    expect(getByTestId("accent").textContent).toBe("indigo");
  });

  it("updates accent and data-accent when setAccent is called", () => {
    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );
    act(() => {
      getByTestId("set-violet").click();
    });
    expect(getByTestId("accent").textContent).toBe("violet");
    expect(document.documentElement.getAttribute("data-accent")).toBe("violet");
  });

  it("persists accent to localStorage when setAccent is called", () => {
    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );
    act(() => {
      getByTestId("set-violet").click();
    });
    expect(localStorage.getItem("accentColour")).toBe("violet");
  });

  it("ACCENT_PALETTE has 8 entries", () => {
    expect(ACCENT_PALETTE).toHaveLength(8);
  });

  it("all palette entries have required fields", () => {
    for (const entry of ACCENT_PALETTE) {
      expect(entry.id).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.swatch).toMatch(/^#[0-9a-f]{6}$/i);
      expect(entry.a11y).toBeTruthy();
    }
  });

  it("handles localStorage being unavailable gracefully", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );

    // Should not throw even when localStorage.setItem fails
    expect(() => {
      act(() => {
        getByTestId("set-violet").click();
      });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });
});
