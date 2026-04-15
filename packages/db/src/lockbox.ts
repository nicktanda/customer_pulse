/**
 * Ruby Lockbox gem–compatible encryption for credentials ciphertext in the database.
 *
 * Matches lockbox gem (AES-256-GCM) key derivation:
 * HKDF-SHA384(master_key, salt=table name, info=32×0xB4 + attribute name, length=32).
 *
 * Ciphertext layout: 12-byte nonce || AES-GCM ciphertext || 16-byte auth tag (same as Ruby Box).
 *
 * Table/attribute for Integration credentials: `integrations` / `credentials`.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

const SEPARATOR = Buffer.alloc(32, 0xb4);

function decodeMasterKey(masterKeyHex: string): Buffer {
  const buf = Buffer.from(masterKeyHex, "hex");
  if (buf.length !== 32) {
    throw new Error("LOCKBOX_MASTER_KEY must be 64 hex characters (32 bytes), matching the Lockbox key format");
  }
  return buf;
}

/** Per-attribute key used by Lockbox for a given AR table + virtual attribute name. */
export function deriveAttributeKey(masterKeyHex: string, table: string, attribute: string): Buffer {
  const ikm = decodeMasterKey(masterKeyHex);
  const salt = Buffer.from(table, "utf8");
  const info = Buffer.concat([SEPARATOR, Buffer.from(attribute, "utf8")]);
  return Buffer.from(hkdfSync("sha384", ikm, salt, info, 32));
}

const NONCE_LEN = 12;
const TAG_LEN = 16;

/** Decrypt base64 ciphertext stored in `integrations.credentials_ciphertext`. */
export function decryptCredentialsColumn(ciphertextB64: string | null | undefined, masterKeyHex: string): string {
  if (ciphertextB64 == null || ciphertextB64 === "") {
    return "";
  }
  const key = deriveAttributeKey(masterKeyHex, "integrations", "credentials");
  const raw = Buffer.from(ciphertextB64, "base64");
  if (raw.length < NONCE_LEN + TAG_LEN) {
    throw new Error("Invalid Lockbox ciphertext (too short)");
  }
  const nonce = raw.subarray(0, NONCE_LEN);
  const body = raw.subarray(NONCE_LEN);
  const tag = body.subarray(body.length - TAG_LEN);
  const enc = body.subarray(0, body.length - TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Encrypt plaintext JSON credentials to the same base64 format Ruby Lockbox produces. */
export function encryptCredentialsColumn(plaintextUtf8: string, masterKeyHex: string): string {
  const key = deriveAttributeKey(masterKeyHex, "integrations", "credentials");
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const enc = Buffer.concat([cipher.update(plaintextUtf8, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, enc, tag]).toString("base64");
}
