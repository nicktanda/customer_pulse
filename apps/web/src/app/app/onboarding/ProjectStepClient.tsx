"use client";

import { useState } from "react";

export function ProjectStepClient({
  savedName,
  formActions,
}: {
  savedName: string;
  formActions: React.ReactNode;
}) {
  const [name, setName] = useState(savedName);

  return (
    <>
      <input type="hidden" name="_onboarding_step" value="project" />
      <div>
        <label htmlFor="onb-project-name" className="form-label">
          Project name
        </label>
        <input
          id="onb-project-name"
          name="project_name"
          required
          className="form-control"
          placeholder="Acme Customer Voice"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {formActions}
    </>
  );
}
