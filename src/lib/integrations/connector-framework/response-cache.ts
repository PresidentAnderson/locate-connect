/**
 * Response Cache
 * Caching layer for connector responses with TTL and invalidation
 */

export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTTLMs?: number;
  /** Maximum cache entries */
  maxEntries?: number;
  /** Enable stale-while-revalidate */
  staleWhileRevalidate?: boolean;
  /** Stale TTL in milliseconds (how long to serve stale while refreshing) */
  staleTTLMs?: number;
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  staleAt?: number;
  etag?: string;
  lastModified?: string;
  hitCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  entries: number;
  hitRate: number;
}

export interface CacheOptions {
  /** Override default TTL for this entry */
  ttlMs?: number;
  /** Tags for cache invalidation */
  tags?: string[];
  /** ETag from response */
  etag?: string;
  /** Last-Modified from response */
  lastModified?: string;
  /** Custom cache key (instead of URL-based) */
  key?: string;
}

/**
 * LRU Response Cache
 * Implements a Least Recently Used cache with TTL support
 */
export class ResponseCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private accessOrder: string[] = [];

  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    evictions: 0,
    entries: 0,
    hitRate: 0,
  };

  constructor(private config: CacheConfig = {}) {
    this.config = {
      defaultTTLMs: config.defaultTTLMs ?? 5 * 60 * 1000, // 5 minutes default
      maxEntries: config.maxEntries ?? 1000,
      staleWhileRevalidate: config.staleWhileRevalidate ?? false,
      staleTTLMs: config.staleTTLMs ?? 60 * 1000, // 1 minute stale window
    };
  }

  /**
   * Generate cache key from request details
   */
  static generateKey(
    method: string,
    url: string,
    params?: Record<string, string>
  ): string {
    const sortedParams = params
      ? Object.keys(params)
          .sort()
          .map((k) => `${k}=${params[k]}`)
          .join('&')
      : '';
    return `${method}:${url}${sortedParams ? `?${sortedParams}` : ''}`;
  }

  /**
   * Get a cached response
   */
  get<T>(key: string): { data: T; stale: boolean } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (now > entry.expiresAt) {
      // Check stale-while-revalidate
      if (this.config.staleWhileRevalidate && entry.staleAt && now <= entry.staleAt) {
        this.stats.staleHits++;
        entry.hitCount++;
        this.updateAccessOrder(key);
        this.updateHitRate();
        return { data: entry.data, stale: true };
      }

      // Fully expired
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Cache hit
    this.stats.hits++;
    entry.hitCount++;
    this.updateAccessOrder(key);
    this.updateHitRate();
    return { data: entry.data, stale: false };
  }

  /**
   * Set a cached response
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const now = Date.now();
    const ttlMs = options.ttlMs ?? this.config.defaultTTLMs!;

    // Evict if at capacity
    while (this.cache.size >= this.config.maxEntries!) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
      staleAt: this.config.staleWhileRevalidate
        ? now + ttlMs + this.config.staleTTLMs!
        : undefined,
      etag: options.etag,
      lastModified: options.lastModified,
      hitCount: 0,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    // Index by tags
    if (options.tags) {
      for (const tag of options.tags) {
        let tagSet = this.tagIndex.get(tag);
        if (!tagSet) {
          tagSet = new Set();
          this.tagIndex.set(tag, tagSet);
        }
        tagSet.add(key);
      }
    }

    this.stats.entries = this.cache.size;
  }

  /**
   * Delete a cached entry
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.stats.entries = this.cache.size;
    }
    return existed;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Invalidate entries by tag
   */
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        count++;
      }
    }
    this.tagIndex.delete(tag);
    return count;
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        if (this.delete(key)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.accessOrder = [];
    this.stats.entries = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get entry metadata (without data)
   */
  getMetadata(key: string): Omit<CacheEntry<unknown>, 'data'> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const { data: _, ...metadata } = entry;
    return metadata;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      const expiry = entry.staleAt || entry.expiresAt;
      if (now > expiry) {
        this.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder.shift()!;
    this.cache.delete(oldestKey);
    this.stats.evictions++;
    this.stats.entries = this.cache.size;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Cache registry for managing per-connector caches
 */
class CacheRegistry {
  private caches: Map<string, ResponseCache> = new Map();

  /**
   * Get or create a cache for a connector
   */
  getOrCreate(connectorId: string, config?: CacheConfig): ResponseCache {
    let cache = this.caches.get(connectorId);
    if (!cache) {
      cache = new ResponseCache(config);
      this.caches.set(connectorId, cache);
    }
    return cache;
  }

  /**
   * Get a cache by connector ID
   */
  get(connectorId: string): ResponseCache | undefined {
    return this.caches.get(connectorId);
  }

  /**
   * Remove a cache
   */
  remove(connectorId: string): void {
    const cache = this.caches.get(connectorId);
    if (cache) {
      cache.clear();
      this.caches.delete(connectorId);
    }
  }

  /**
   * Get all stats
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [id, cache] of this.caches) {
      stats[id] = cache.getStats();
    }
    return stats;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Prune all caches
   */
  pruneAll(): number {
    let total = 0;
    for (const cache of this.caches.values()) {
      total += cache.prune();
    }
    return total;
  }
}

// Global cache registry
const globalCacheRegistry = new CacheRegistry();

export function getCacheRegistry(): CacheRegistry {
  return globalCacheRegistry;
}
