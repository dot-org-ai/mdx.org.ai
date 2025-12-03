/**
 * @mdxdb/sources - Caching with TTL and SWR support
 */

import type { CacheConfig, CacheEntry, CacheStorage, SourceRequest } from './types.js'

/**
 * Cache result with SWR metadata
 */
export interface CacheResult<T> {
  data: T
  cached: boolean
  stale: boolean
  revalidating: boolean
}

/**
 * In-memory cache storage implementation
 */
export class MemoryCache implements CacheStorage {
  private cache = new Map<string, CacheEntry<unknown>>()
  private tagIndex = new Map<string, Set<string>>()

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) return null

    // Check if completely expired (past stale window)
    const maxAge = entry.ttl + (entry.staleWhileRevalidate || 0)
    if (Date.now() - entry.cachedAt > maxAge * 1000) {
      this.cache.delete(key)
      return null
    }

    return entry
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.cache.set(key, entry as CacheEntry<unknown>)

    // Index by tags for invalidation
    if (entry.tags) {
      for (const tag of entry.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set())
        }
        this.tagIndex.get(tag)!.add(key)
      }
    }
  }

  async delete(key: string): Promise<void> {
    const entry = this.cache.get(key)
    if (entry?.tags) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key)
      }
    }
    this.cache.delete(key)
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag)
    if (keys) {
      for (const key of keys) {
        this.cache.delete(key)
      }
      this.tagIndex.delete(tag)
    }
  }

  /** Clear all cache entries */
  async clear(): Promise<void> {
    this.cache.clear()
    this.tagIndex.clear()
  }

  /** Get cache statistics */
  stats(): { size: number; tags: number } {
    return {
      size: this.cache.size,
      tags: this.tagIndex.size,
    }
  }
}

/**
 * KV-based cache storage (Cloudflare Workers KV compatible)
 */
export class KVCache implements CacheStorage {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const raw = await this.kv.get(key, 'json')
    if (!raw) return null

    const entry = raw as CacheEntry<T>

    // Check if completely expired
    const maxAge = entry.ttl + (entry.staleWhileRevalidate || 0)
    if (Date.now() - entry.cachedAt > maxAge * 1000) {
      await this.kv.delete(key)
      return null
    }

    return entry
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const maxAge = entry.ttl + (entry.staleWhileRevalidate || 0)
    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: maxAge,
    })

    // Store tag index separately
    if (entry.tags) {
      for (const tag of entry.tags) {
        const tagKey = `__tag:${tag}`
        const existing = (await this.kv.get(tagKey, 'json')) as string[] || []
        if (!existing.includes(key)) {
          existing.push(key)
          await this.kv.put(tagKey, JSON.stringify(existing))
        }
      }
    }
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key)
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = `__tag:${tag}`
    const keys = (await this.kv.get(tagKey, 'json')) as string[] || []
    await Promise.all([
      ...keys.map((key) => this.kv.delete(key)),
      this.kv.delete(tagKey),
    ])
  }
}

// KV namespace type for Cloudflare Workers
interface KVNamespace {
  get(key: string, type: 'json'): Promise<unknown>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Cache manager with SWR support
 */
export class CacheManager {
  private storage: CacheStorage
  private revalidating = new Set<string>()
  private pendingRevalidations = new Map<string, Promise<unknown>>()

  constructor(storage?: CacheStorage) {
    this.storage = storage || new MemoryCache()
  }

  /**
   * Generate cache key from request
   */
  generateKey(request: SourceRequest, config?: CacheConfig): string {
    if (config?.key) {
      return config.key(request)
    }

    const parts = [
      request.method,
      request.path,
      request.query ? JSON.stringify(sortObject(request.query)) : '',
      request.body ? JSON.stringify(request.body) : '',
    ]

    return parts.filter(Boolean).join(':')
  }

  /**
   * Get cached value with SWR support
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<CacheResult<T>> {
    const entry = await this.storage.get<T>(key)

    // No cache entry - fetch fresh
    if (!entry) {
      const data = await fetcher()
      await this.set(key, data, config)
      return { data, cached: false, stale: false, revalidating: false }
    }

    const age = Date.now() - entry.cachedAt
    const isStale = age > entry.ttl * 1000
    const isExpired = age > (entry.ttl + (entry.staleWhileRevalidate || 0)) * 1000

    // Completely expired - fetch fresh
    if (isExpired) {
      const data = await fetcher()
      await this.set(key, data, config)
      return { data, cached: false, stale: false, revalidating: false }
    }

    // Stale but within SWR window - return stale and revalidate in background
    if (isStale && entry.staleWhileRevalidate) {
      this.revalidateInBackground(key, fetcher, config)
      return {
        data: entry.data,
        cached: true,
        stale: true,
        revalidating: this.revalidating.has(key),
      }
    }

    // Fresh cache hit
    return { data: entry.data, cached: true, stale: false, revalidating: false }
  }

  /**
   * Set cache value
   */
  async set<T>(key: string, data: T, config: CacheConfig): Promise<void> {
    const tags = typeof config.tags === 'function' ? config.tags(data) : config.tags

    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttl: config.ttl,
      staleWhileRevalidate: config.staleWhileRevalidate,
      tags,
    }

    await this.storage.set(key, entry)
  }

  /**
   * Invalidate cache by key or tags
   */
  async invalidate(key?: string, tags?: string[]): Promise<void> {
    if (key) {
      await this.storage.delete(key)
    }

    if (tags) {
      await Promise.all(tags.map((tag) => this.storage.invalidateByTag(tag)))
    }
  }

  /**
   * Revalidate cache entry in background
   */
  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<void> {
    // Don't start multiple revalidations for the same key
    if (this.revalidating.has(key)) {
      return
    }

    this.revalidating.add(key)

    // Dedupe concurrent revalidation requests
    let pending = this.pendingRevalidations.get(key) as Promise<T> | undefined
    if (!pending) {
      pending = fetcher()
      this.pendingRevalidations.set(key, pending)
    }

    try {
      const data = await pending
      await this.set(key, data, config)
    } catch (error) {
      // Log but don't throw - we're in the background
      console.error(`Failed to revalidate cache key ${key}:`, error)
    } finally {
      this.revalidating.delete(key)
      this.pendingRevalidations.delete(key)
    }
  }
}

/**
 * Sort object keys for consistent cache key generation
 */
function sortObject<T extends Record<string, unknown>>(obj: T): T {
  const sorted = {} as T
  for (const key of Object.keys(obj).sort()) {
    sorted[key as keyof T] = obj[key as keyof T]
  }
  return sorted
}

/**
 * Create cache config with defaults
 */
export function createCacheConfig(config: Partial<CacheConfig>): CacheConfig {
  return {
    ttl: config.ttl ?? 60,
    staleWhileRevalidate: config.staleWhileRevalidate ?? 0,
    key: config.key,
    storage: config.storage,
    tags: config.tags,
  }
}

/**
 * Default cache instance
 */
export const defaultCache = new CacheManager()
