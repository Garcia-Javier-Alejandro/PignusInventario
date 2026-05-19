// KV caching for inventory reads that get hit frequently and whose data
// changes only on a small set of write paths. Keys + TTLs are defined here so
// every endpoint uses the same names, and the invalidator can clear them all
// in one call after a write.

import type { Context } from 'hono'
import type { Env } from './types'

export const CACHE_KEYS = {
  dashboard: 'dashboard:summary',
  lowStock: 'low_stock:list',
} as const

export const CACHE_TTL = {
  dashboard: 5 * 60, // 5 minutes
  lowStock: 2 * 60,  // 2 minutes
} as const

/**
 * Read-through KV cache. Returns the cached value if present, otherwise
 * runs `compute`, stores the result with the given TTL, and returns the
 * fresh value. The cache write is fire-and-forget via waitUntil so the
 * response isn't delayed by the put.
 */
export async function getCachedJson<T>(
  c: Context<{ Bindings: Env }>,
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const cached = await c.env.CACHE.get<T>(key, 'json')
  if (cached !== null) return cached
  const fresh = await compute()
  c.executionCtx.waitUntil(
    c.env.CACHE.put(key, JSON.stringify(fresh), { expirationTtl: ttlSeconds }),
  )
  return fresh
}

/**
 * Call after any write that affects stock, low-stock state, or active
 * filament counts. Deletes every inventory-related cache key.
 */
export async function invalidateInventoryCache(env: Env): Promise<void> {
  await Promise.all([
    env.CACHE.delete(CACHE_KEYS.dashboard),
    env.CACHE.delete(CACHE_KEYS.lowStock),
  ])
}
