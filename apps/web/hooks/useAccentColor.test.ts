import { act, renderHook } from "@testing-library/react";
import { useAccentColor } from "./useAccentColor";
import * as accentColorLib from "../lib/accentColor";

// Mock the DOM-dependent applyAccentColor function
jest.mock("../lib/accentColor", () => ({
  ...jest.requireActual("../lib/accentColor"),
  applyAccentColor: jest.fn(),
}));

const mockApplyAccentColor = accentColorLib.applyAccentColor as jest.Mock;

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

beforeEach(() => {
  localStorageMock.clear();
  mockApplyAccentColor.mockClear();
});

describe("useAccentColor", () => {
  it("initialises with the default colour when no serverValue or stored value", () => {
    const { result } = renderHook(() => useAccentColor());
    expect(result.current.accentColor).toBe("#6366f1");
  });

  it("initialises with the serverValue when provided", () => {
    const { result } = renderHook(() => useAccentColor("#be123c"));
    expect(result.current.accentColor).toBe("#be123c");
  });

  it("initialises with a stored value when no serverValue", () => {
    localStorageMock.setItem("user_accent_color", "#047857");
    const { result } = renderHook(() => useAccentColor());
    expect(result.current.accentColor).toBe("#047857");
  });

  it("applies the accent colour on mount", () => {
    renderHook(() => useAccentColor("#be123c"));
    expect(mockApplyAccentColor).toHaveBeenCalledWith("#be123c");
  });

  it("updates accentColor and persists to localStorage when setAccentColor is called", () => {
    const { result } = renderHook(() => useAccentColor());
    act(() => {
      result.current.setAccentColor("#0369a1");
    });
    expect(result.current.accentColor).toBe("#0369a1");
    expect(localStorageMock.getItem("user_accent_color")).toBe("#0369a1");
  });

  it("ignores invalid hex values in setAccentColor", () => {
    const { result } = renderHook(() => useAccentColor());
    act(() => {
      result.current.setAccentColor("notahex");
    });
    expect(result.current.accentColor).toBe("#6366f1");
  });

  it("resets to default when resetToDefault is called", () => {
    const { result } = renderHook(() => useAccentColor("#be123c"));
    act(() => {
      result.current.resetToDefault();
    });
    expect(result.current.accentColor).toBe("#6366f1");
  });

  it("sets contrastWarning to true for a light colour", () => {
    const { result } = renderHook(() => useAccentColor("#fde68a"));
    expect(result.current.contrastWarning).toBe(true);
  });

  it("sets contrastWarning to false for a dark colour", () => {
    const { result } = renderHook(() => useAccentColor("#1d4ed8"));
    expect(result.current.contrastWarning).toBe(false);
  });
});
