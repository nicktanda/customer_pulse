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

  it("reads accent from localStorage on mount", () => {
    localStorage.setItem("accentColour", "rose");
    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );
    expect(getByTestId("accent").textContent).toBe("rose");
  });

  it("falls back to default when localStorage value is invalid", () => {
    localStorage.setItem("accentColour", "banana");
    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );
    expect(getByTestId("accent").textContent).toBe("indigo");
  });

  it("setAccent updates localStorage and data-accent attribute", () => {
    const { getByTestId } = render(
      <AccentColourProvider>
        <Consumer />
      </AccentColourProvider>
    );

    act(() => {
      getByTestId("set-violet").click();
    });

    expect(localStorage.getItem("accentColour")).toBe("violet");
    expect(document.documentElement.getAttribute("data-accent")).toBe("violet");
    expect(getByTestId("accent").textContent).toBe("violet");
  });

  it("ACCENT_PALETTE contains exactly 8 entries", () => {
    expect(ACCENT_PALETTE).toHaveLength(8);
  });

  it("all ACCENT_PALETTE ids are valid AccentColour values", () => {
    const ids = ACCENT_PALETTE.map((e) => e.id);
    expect(ids).toContain("indigo");
    expect(ids).toContain("violet");
    expect(ids).toContain("sky");
    expect(ids).toContain("teal");
    expect(ids).toContain("emerald");
    expect(ids).toContain("amber");
    expect(ids).toContain("rose");
    expect(ids).toContain("slate");
  });
});
