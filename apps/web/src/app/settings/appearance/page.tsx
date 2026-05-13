import React from "react";
import AccentColourPicker from "../../components/AccentColourPicker";
import "../../accent-colour-picker.css";

export const metadata = {
  title: "Appearance Settings",
  description: "Personalise the look of the app.",
};

export default function AppearancePage() {
  return (
    <div className="container py-4" style={{ maxWidth: "640px" }}>
      <h1 className="h4 mb-1">Appearance</h1>
      <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
        Personalise the interface to match your style.
      </p>

      <div
        className="card"
        style={{
          borderRadius: "0.75rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <div className="card-body" style={{ padding: "1.5rem" }}>
          <h2
            className="h6 mb-1"
            style={{ fontWeight: 600, letterSpacing: "-0.01em" }}
          >
            Accent colour
          </h2>
          <p
            className="text-muted mb-3"
            style={{ fontSize: "0.82rem" }}
          >
            Choose a colour used on buttons, links, and interactive elements
            throughout the app. All options meet WCAG AA contrast requirements.
          </p>
          <AccentColourPicker />
        </div>
      </div>

      <div
        className="card mt-3"
        style={{
          borderRadius: "0.75rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <div className="card-body" style={{ padding: "1.5rem" }}>
          <h2
            className="h6 mb-2"
            style={{ fontWeight: 600 }}
          >
            Preview
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#555" }} className="mb-3">
            The elements below update live as you change your accent colour.
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button className="btn btn-accent btn-sm" type="button">
              Primary action
            </button>
            <button
              className="btn btn-sm"
              type="button"
              style={{
                border: "1px solid var(--accent-600)",
                color: "var(--accent-600)",
                background: "transparent",
              }}
            >
              Secondary action
            </button>
            <a href="#" className="text-accent" style={{ fontSize: "0.85rem" }}>
              Accent link
            </a>
            <span
              className="badge-accent"
              style={{
                borderRadius: "999px",
                padding: "0.2em 0.65em",
                fontSize: "0.75rem",
              }}
            >
              Badge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
