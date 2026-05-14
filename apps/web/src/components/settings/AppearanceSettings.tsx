"use client";

import React from "react";
import { AccentColourPicker } from "@/components/accent-colour/AccentColourPicker";

export function AppearanceSettings() {
  return (
    <div className="container-fluid px-0">
      <h4 className="mb-1">Appearance</h4>
      <p className="text-muted mb-4">
        Personalise the look of the app. Changes are saved to your browser and
        applied immediately.
      </p>

      <div className="card">
        <div className="card-body">
          <AccentColourPicker />
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-body">
          <label className="form-label fw-semibold mb-2 d-block">Preview</label>
          <p className="text-muted small mb-3">
            These elements reflect your current accent colour selection.
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button type="button" className="btn btn-primary btn-sm">
              Primary button
            </button>
            <button type="button" className="btn btn-outline-primary btn-sm">
              Outline button
            </button>
            <a href="#" onClick={(e) => e.preventDefault()} className="small">
              Link text
            </a>
            <span className="badge bg-primary">Badge</span>
            <div className="form-check d-inline-flex align-items-center gap-1 mb-0">
              <input
                className="form-check-input mt-0"
                type="checkbox"
                defaultChecked
                id="accent-preview-check"
                readOnly
              />
              <label className="form-check-label" htmlFor="accent-preview-check">
                Checkbox
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
