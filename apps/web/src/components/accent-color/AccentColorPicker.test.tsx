import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccentColorPicker, passesWcagAA, DEFAULT_ACCENT } from "./AccentColorPicker";

describe("passesWcagAA", () => {
  it("returns true for dark blue (high contrast on white)", () => {
    expect(passesWcagAA("#1e3a8a")).toBe(true);
  });

  it("returns false for light yellow (low contrast on white)", () => {
    expect(passesWcagAA("#fef08a")).toBe(false);
  });

  it("accepts the default brand blue", () => {
    expect(passesWcagAA(DEFAULT_ACCENT)).toBe(true);
  });
});

describe("AccentColorPicker", () => {
  it("renders preset swatches", () => {
    const onChange = jest.fn();
    render(<AccentColorPicker value={DEFAULT_ACCENT} onChange={onChange} />);
    const swatches = screen.getAllByRole("radio");
    expect(swatches.length).toBeGreaterThanOrEqual(8);
  });

  it("marks the active swatch as checked", () => {
    const onChange = jest.fn();
    render(<AccentColorPicker value="#7c3aed" onChange={onChange} />);
    const violet = screen.getByRole("radio", { name: "Violet" });
    expect(violet).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange when a swatch is clicked", () => {
    const onChange = jest.fn();
    render(<AccentColorPicker value={DEFAULT_ACCENT} onChange={onChange} />);
    const roseBtn = screen.getByRole("radio", { name: "Rose" });
    fireEvent.click(roseBtn);
    expect(onChange).toHaveBeenCalledWith("#e11d48");
  });

  it("shows the advanced picker toggle", () => {
    const onChange = jest.fn();
    render(<AccentColorPicker value={DEFAULT_ACCENT} onChange={onChange} />);
    expect(screen.getByRole("button", { name: /custom colour/i })).toBeInTheDocument();
  });

  it("reveals the colour input when advanced toggle is clicked", () => {
    const onChange = jest.fn();
    render(<AccentColorPicker value={DEFAULT_ACCENT} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /custom colour/i }));
    expect(screen.getByLabelText("Pick any colour")).toBeInTheDocument();
  });

  it("does not call onChange when disabled", () => {
    const onChange = jest.fn();
    render(
      <AccentColorPicker value={DEFAULT_ACCENT} onChange={onChange} disabled />
    );
    const swatches = screen.getAllByRole("radio");
    fireEvent.click(swatches[1]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
