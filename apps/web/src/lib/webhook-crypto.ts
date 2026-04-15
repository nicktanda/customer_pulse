import { createHmac, timingSafeEqual } from "crypto";

/** Linear webhook: hex HMAC-SHA256 of raw body. */
export function verifyLinearSignature(rawBody: string, secret: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) {
    return true;
  }
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(signatureHeader, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Jira / Atlassian: `sha256=<hex>` */
export function verifyJiraSignature(rawBody: string, secret: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) {
    return true;
  }
  const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expected = `sha256=${expectedHex}`;
  try {
    const a = Buffer.from(signatureHeader, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Slack: `v0=` + hex HMAC-SHA256 of `v0:${timestamp}:${rawBody}` */
export function verifySlackSignature(
  rawBody: string,
  signingSecret: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  maxSkewSeconds = 300,
): boolean {
  if (!signingSecret) {
    return true;
  }
  if (!timestampHeader || !signatureHeader) {
    return false;
  }
  const ts = Number.parseInt(timestampHeader, 10);
  if (Number.isNaN(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > maxSkewSeconds) {
    return false;
  }
  const sigBase = `v0:${timestampHeader}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(sigBase, "utf8").digest("hex")}`;
  try {
    const a = Buffer.from(signatureHeader, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
