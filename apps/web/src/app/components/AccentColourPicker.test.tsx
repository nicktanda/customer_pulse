import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import AccentColourPicker, {
  contrastAgainstWhite,
  isValidHex,
  CURATED_PALETTE,
} from "./AccentColourPicker";

describe("isValidHex", () => {
  it("accepts a valid 6-digit hex", () => {
    expect(isValidHex("#6366f1")).toBe(true);
  });

  it("rejects a 3-digit hex", () => {
    expect(isValidHex("#fff")).toBe(false);
  });

  it("rejects hex without hash", () => {
    expect(isValidHex("6366f1")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidHex("#zzzzzz")).toBe(false);
  });
});

describe("contrastAgainstWhite", () => {
  it("returns a high ratio for black", () => {
    expect(contrastAgainstWhite("#000000")).toBeGreaterThan(20);
  });

  it("returns 1 for white", () => {
    expect(contrastAgainstWhite("#ffffff")).toBeCloseTo(1, 1);
  });

  it("flags a light colour as low contrast", () => {
    // A very pale yellow – known to be low contrast
    expect(contrastAgainstWhite("#ffffaa")).toBeLessThan(3);
  });
});

describe("AccentColourPicker", () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    jest.spyOn(Storage.prototype, "getItem").mockImplementation((k) => store[k] ?? null);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => { store[k] = v; });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders curated swatches", () => {
    render(<AccentColourPicker />);
    CURATED_PALETTE.forEach((swatch) => {
      expect(screen.getByRole("radio", { name: swatch.label })).toBeInTheDocument();
    });
  });

  it("calls onChange when a swatch is clicked", () => {
    const onChange = jest.fn();
    render(<AccentColourPicker onChange={onChange} />);
    const teal = screen.getByRole("radio", { name: "Teal" });
    fireEvent.click(teal);
    expect(onChange).toHaveBeenCalledWith("#14b8a6");
  });

  it("marks clicked swatch as checked", () => {
    render(<AccentColourPicker />);
    const sky = screen.getByRole("radio", { name: "Sky" });
    fireEvent.click(sky);
    expect(sky).toHaveAttribute("aria-checked", "true");
  });

  it("shows contrast warning for a low-contrast colour", () => {
    // #ffffaa has contrast < 4.5 against white, so warning should appear
    render(<AccentColourPicker initialColour="#ffffaa" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not show contrast warning for an accessible colour", () => {
    render(<AccentColourPicker initialColour="#000000" />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("toggles the free colour picker on custom button click", () => {
    render(<AccentColourPicker />);
    expect(screen.queryByLabelText("Hex colour value")).toBeNull();
    fireEvent.click(screen.getByTitle("Custom colour"));
    expect(screen.getByLabelText("Hex colour value")).toBeInTheDocument();
  });
});
