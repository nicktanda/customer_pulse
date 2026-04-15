import { describe, expect, it } from "vitest";
import { decryptCredentialsColumn, encryptCredentialsColumn } from "./lockbox";

describe("Lockbox compatibility (Node round-trip)", () => {
  it("encrypts and decrypts credentials JSON", () => {
    const masterKey = "a".repeat(64);
    const plain = JSON.stringify({ api_key: "secret", token: "x" });
    const enc = encryptCredentialsColumn(plain, masterKey);
    expect(enc.length).toBeGreaterThan(20);
    const dec = decryptCredentialsColumn(enc, masterKey);
    expect(dec).toBe(plain);
  });

  it("rejects wrong key length", () => {
    expect(() => encryptCredentialsColumn("{}", "abcd")).toThrow(/64 hex/);
  });
});
