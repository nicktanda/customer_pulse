import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AccentColourSection from "./AccentColourSection";

// Mock the feature-flag so we control visibility independently of the env var
jest.mock("./accent-colour-feature-flag", () => ({
  isAccentColourEnabled: jest.fn(() => true),
}));

describe("AccentColourSection", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    jest.spyOn(Storage.prototype, "getItem").mockImplementation((k) => store[k] ?? null);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => { store[k] = v; });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders nothing when enabled=false", () => {
    const { container } = render(<AccentColourSection enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the personalisation heading when enabled=true", async () => {
    render(<AccentColourSection enabled={true} />);
    await waitFor(() =>
      expect(screen.getByText("Personalisation")).toBeInTheDocument()
    );
  });

  it("does not show saving state when no onSave is provided", async () => {
    render(<AccentColourSection enabled={true} />);
    await waitFor(() => screen.getByText("Personalisation"));
    // Click a swatch – no saving state should appear
    const indigo = screen.getByRole("radio", { name: "Indigo" });
    fireEvent.click(indigo);
    expect(screen.queryByText("Saving\u2026")).toBeNull();
  });

  it("calls onSave and shows saved feedback", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(<AccentColourSection enabled={true} onSave={onSave} />);
    await waitFor(() => screen.getByText("Personalisation"));

    const teal = screen.getByRole("radio", { name: "Teal" });
    fireEvent.click(teal);

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("#14b8a6"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("\u2713 Colour saved")
    );
  });

  it("uses the feature-flag when enabled prop is omitted", async () => {
    const { isAccentColourEnabled } = require("./accent-colour-feature-flag");
    (isAccentColourEnabled as jest.Mock).mockReturnValue(false);

    const { container } = render(<AccentColourSection />);
    // After mount the flag returns false so nothing should render
    await waitFor(() => expect(container.firstChild).toBeNull());
  });
});
