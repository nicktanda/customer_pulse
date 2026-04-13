"use client";

import { useState } from "react";

export function TestConnectionButton({
  type,
  getCredentials,
}: {
  type: string;
  getCredentials: () => Record<string, unknown> | null;
}) {
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    const credentials = getCredentials();
    if (!credentials) {
      setStatus({ success: false, message: "Enter credentials first" });
      return;
    }

    setTesting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/app/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, credentials }),
      });
      const result = (await res.json()) as { success: boolean; message: string };
      setStatus(result);
    } catch {
      setStatus({ success: false, message: "Test request failed" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={handleTest}
        disabled={testing}
      >
        {testing ? "Testing\u2026" : "Test connection"}
      </button>
      {status ? (
        <span className={`ms-2 small ${status.success ? "text-success" : "text-danger"}`}>
          {status.success ? "\u2713" : "\u2717"} {status.message}
        </span>
      ) : null}
    </div>
  );
}
