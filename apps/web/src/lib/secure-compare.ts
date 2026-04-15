import { timingSafeEqual } from "crypto";

/** Constant-time string compare for secrets (API keys, tokens). */
export function secureCompare(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) {
    return false;
  }
  return timingSafeEqual(x, y);
}
