import Redis from "ioredis";

let redis: Redis | null = null;

/** Shared Redis connection for BullMQ producers (Next.js API routes). */
export function getRedis(): Redis {
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379/0";
  if (!redis) {
    redis = new Redis(url, { maxRetriesPerRequest: null });
  }
  return redis;
}
