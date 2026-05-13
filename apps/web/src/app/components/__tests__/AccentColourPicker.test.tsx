import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import AccentColourProvider from "../AccentColourProvider";
import AccentColourPicker from "../AccentColourPicker";

function Fixture() {
  return (
    <AccentColourProvider>
      <AccentColourPicker />
    </AccentColourProvider>
  );
}

describe("AccentColourPicker", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-accent");
  });

  it("renders 8 swatch buttons", () => {
    const { getAllByRole } = render(<Fixture />);
    const radios = getAllByRole("radio");
    expect(radios).toHaveLength(8);
  });

  it("marks the default (indigo) swatch as checked", () => {
    const { getByRole } = render(<Fixture />);
    const indigoBtn = getByRole("radio", { name: "Indigo" });
    expect(indigoBtn.getAttribute("aria-checked")).toBe("true");
  });

  it("clicking a swatch marks it as selected and updates data-accent", () => {
    const { getByRole } = render(<Fixture />);
    const roseBtn = getByRole("radio", { name: "Rose" });
    fireEvent.click(roseBtn);
    expect(roseBtn.getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.getAttribute("data-accent")).toBe("rose");
  });

  it("persists the selected colour to localStorage", () => {
    const { getByRole } = render(<Fixture />);
    const tealBtn = getByRole("radio", { name: "Teal" });
    fireEvent.click(tealBtn);
    expect(localStorage.getItem("accentColour")).toBe("teal");
  });

  it("only one swatch is checked at a time", () => {
    const { getAllByRole, getByRole } = render(<Fixture />);
    const violetBtn = getByRole("radio", { name: "Violet" });
    fireEvent.click(violetBtn);
    const checked = getAllByRole("radio").filter(
      (el) => el.getAttribute("aria-checked") === "true"
    );
    expect(checked).toHaveLength(1);
    expect(checked[0].getAttribute("aria-label")).toBe("Violet");
  });
});
