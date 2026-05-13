import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  AccentColorProvider,
  useAccentColor,
  ACCENT_COLORS,
} from "../contexts/accent-color-context";

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// ---------------------------------------------------------------------------
// document.documentElement.style mock
// ---------------------------------------------------------------------------

const setPropertyMock = vi.fn();
Object.defineProperty(document, "documentElement", {
  value: { style: { setProperty: setPropertyMock } },
  writable: true,
});

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  return <AccentColorProvider>{children}</AccentColorProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AccentColorProvider / useAccentColor", () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    setPropertyMock.mockClear();
  });

  it("initialises with the default indigo accent", () => {
    const { result } = renderHook(() => useAccentColor(), { wrapper });
    expect(result.current.accentId).toBe("indigo");
  });

  it("updates accentId when setAccentId is called", () => {
    const { result } = renderHook(() => useAccentColor(), { wrapper });
    act(() => {
      result.current.setAccentId("teal");
    });
    expect(result.current.accentId).toBe("teal");
  });

  it("persists the chosen accent to localStorage", () => {
    const { result } = renderHook(() => useAccentColor(), { wrapper });
    act(() => {
      result.current.setAccentId("rose");
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith("accent-color", "rose");
  });

  it("restores accent from localStorage on mount", () => {
    localStorageMock.getItem.mockReturnValueOnce("emerald");
    const { result } = renderHook(() => useAccentColor(), { wrapper });
    // After mount effect runs
    act(() => {});
    expect(result.current.accentId).toBe("emerald");
  });

  it("falls back to default if stored value is not a valid AccentColorId", () => {
    localStorageMock.getItem.mockReturnValueOnce("invalid-colour");
    const { result } = renderHook(() => useAccentColor(), { wrapper });
    act(() => {});
    expect(result.current.accentId).toBe("indigo");
  });

  it("applies the CSS custom property when accent changes", () => {
    const { result } = renderHook(() => useAccentColor(), { wrapper });
    act(() => {
      result.current.setAccentId("sky");
    });
    const skyColor = ACCENT_COLORS.find((c) => c.id === "sky");
    expect(setPropertyMock).toHaveBeenCalledWith("--accent", skyColor?.value);
  });

  it("throws if useAccentColor is called outside a provider", () => {
    // Suppress React error boundary output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderHook(() => useAccentColor())
    ).toThrow("useAccentColor must be used within an AccentColorProvider");
    spy.mockRestore();
  });
});
