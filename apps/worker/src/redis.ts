import { Redis } from "ioredis";

let shared: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!shared) {
    const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379/0";
    shared = new Redis(url, { maxRetriesPerRequest: null });
  }
  return shared;
}
