"use client";

import { TestConnectionButton } from "@/app/app/onboarding/TestConnectionButton";

export function GithubTestButton() {
  return (
    <TestConnectionButton
      type="github"
      getCredentials={() => {
        const token = (document.getElementById("gh-token") as HTMLInputElement | null)?.value ?? "";
        const owner = (document.getElementById("gh-owner") as HTMLInputElement | null)?.value ?? "";
        const repo = (document.getElementById("gh-repo") as HTMLInputElement | null)?.value ?? "";
        if (!token && !owner) return null;
        return { access_token: token, owner, repo };
      }}
    />
  );
}
