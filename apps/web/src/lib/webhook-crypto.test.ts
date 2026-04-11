import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyJiraSignature, verifyLinearSignature, verifySlackSignature } from "./webhook-crypto";

describe("webhook signatures", () => {
  it("verifies Linear hex HMAC", () => {
    const secret = "shh";
    const body = '{"hello":true}';
    const sig = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(verifyLinearSignature(body, secret, sig)).toBe(true);
    expect(verifyLinearSignature(body, secret, "deadbeef")).toBe(false);
  });

  it("verifies Jira sha256= prefix", () => {
    const secret = "x";
    const body = "{}";
    const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(verifyJiraSignature(body, secret, `sha256=${hex}`)).toBe(true);
  });

  it("verifies Slack v0 signature", () => {
    const secret = "SECRET";
    const body = "payload=test";
    const ts = String(Math.floor(Date.now() / 1000));
    const base = `v0:${ts}:${body}`;
    const sig = `v0=${createHmac("sha256", secret).update(base, "utf8").digest("hex")}`;
    expect(verifySlackSignature(body, secret, ts, sig)).toBe(true);
    expect(verifySlackSignature(body, secret, ts, "v0=wrong")).toBe(false);
  });
});
