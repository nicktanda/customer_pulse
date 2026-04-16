/**
 * LRU-cached connection pool manager for per-tenant Drizzle instances.
 *
 * Each tenant gets a small postgres.js pool (default 3 connections — Neon
 * handles server-side pooling).  Pools are evicted when the cache is full
 * (LRU) or when they've been idle longer than `idleTimeoutMs`.
 *
 * Use the singleton `getTenantConnectionManager()` in both web and worker.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import type { Database } from "./client";

interface CachedPool {
  db: Database;
  sql: ReturnType<typeof postgres>;
  lastUsed: number;
}

export class TenantConnectionManager {
  private pools = new Map<string, CachedPool>();
  private maxPools: number;
  private poolMaxConnections: number;
  private idleTimeoutMs: number;
  private evictionTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts?: { maxPools?: number; poolMaxConnections?: number; idleTimeoutMs?: number }) {
    const envMax = Number.parseInt(process.env.TENANT_POOL_MAX_CACHED ?? "", 10);
    this.maxPools = opts?.maxPools ?? (Number.isFinite(envMax) && envMax > 0 ? envMax : 50);
    this.poolMaxConnections = opts?.poolMaxConnections ?? 3;
    this.idleTimeoutMs = opts?.idleTimeoutMs ?? 5 * 60 * 1000; // 5 minutes

    // Periodically evict idle pools
    this.evictionTimer = setInterval(() => this.evictIdle(), 60_000);
    // Don't prevent process exit
    if (this.evictionTimer.unref) this.evictionTimer.unref();
  }

  /** Get or create a Drizzle instance for the given tenant. */
  getTenantDb(slug: string, connectionString: string): Database {
    const existing = this.pools.get(slug);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.db;
    }

    // Evict LRU if at capacity
    if (this.pools.size >= this.maxPools) {
      this.evictLru();
    }

    const sql = postgres(connectionString, { max: this.poolMaxConnections });
    const db = drizzle(sql, { schema }) as Database;
    this.pools.set(slug, { db, sql, lastUsed: Date.now() });
    return db;
  }

  /** Close a specific tenant's pool and remove it from the cache. */
  async closeTenantDb(slug: string): Promise<void> {
    const entry = this.pools.get(slug);
    if (entry) {
      this.pools.delete(slug);
      await entry.sql.end({ timeout: 5 });
    }
  }

  /** Close all pools (graceful shutdown). */
  async closeAll(): Promise<void> {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = null;
    }
    const closing = [...this.pools.entries()].map(async ([slug, entry]) => {
      this.pools.delete(slug);
      await entry.sql.end({ timeout: 5 });
    });
    await Promise.allSettled(closing);
  }

  /** Number of currently cached tenant pools. */
  get size(): number {
    return this.pools.size;
  }

  /** Evict pools idle longer than idleTimeoutMs. */
  private evictIdle(): void {
    const cutoff = Date.now() - this.idleTimeoutMs;
    for (const [slug, entry] of this.pools) {
      if (entry.lastUsed < cutoff) {
        this.pools.delete(slug);
        // Fire-and-forget close — don't block the eviction loop
        entry.sql.end({ timeout: 5 }).catch(() => {});
      }
    }
  }

  /** Evict the least-recently-used pool. */
  private evictLru(): void {
    let oldestSlug: string | null = null;
    let oldestTime = Infinity;
    for (const [slug, entry] of this.pools) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestSlug = slug;
      }
    }
    if (oldestSlug) {
      const entry = this.pools.get(oldestSlug);
      this.pools.delete(oldestSlug);
      entry?.sql.end({ timeout: 5 }).catch(() => {});
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton (globalThis to survive hot reload)                       */
/* ------------------------------------------------------------------ */

const globalForTcm = globalThis as typeof globalThis & {
  __tenantConnectionManager?: TenantConnectionManager;
};

export function getTenantConnectionManager(): TenantConnectionManager {
  if (!globalForTcm.__tenantConnectionManager) {
    globalForTcm.__tenantConnectionManager = new TenantConnectionManager();
  }
  return globalForTcm.__tenantConnectionManager;
}
