/**
 * Tests for Response Cache
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResponseCache,
  getCacheRegistry,
  type CacheConfig,
} from './response-cache';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  const createConfig = (overrides: Partial<CacheConfig> = {}): CacheConfig => ({
    defaultTTLMs: 5000,
    maxEntries: 100,
    staleWhileRevalidate: false,
    staleTTLMs: 1000,
    ...overrides,
  });

  beforeEach(() => {
    cache = new ResponseCache(createConfig());
  });

  describe('generateKey', () => {
    it('should generate key from method and URL', () => {
      const key = ResponseCache.generateKey('GET', '/api/users');
      expect(key).toBe('GET:/api/users');
    });

    it('should include sorted params in key', () => {
      const key = ResponseCache.generateKey('GET', '/api/users', {
        z: '1',
        a: '2',
      });
      expect(key).toBe('GET:/api/users?a=2&z=1');
    });

    it('should handle empty params', () => {
      const key = ResponseCache.generateKey('POST', '/api/data', {});
      expect(key).toBe('POST:/api/data');
    });
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const data = { users: [{ id: 1 }] };
      cache.set('test-key', data);

      const result = cache.get<typeof data>('test-key');

      expect(result).not.toBeNull();
      expect(result?.data).toEqual(data);
      expect(result?.stale).toBe(false);
    });

    it('should return null for missing key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for expired entry', async () => {
      const shortTTLCache = new ResponseCache(createConfig({ defaultTTLMs: 50 }));

      shortTTLCache.set('expire-test', { value: 1 });

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 100));

      const result = shortTTLCache.get('expire-test');
      expect(result).toBeNull();
    });

    it('should respect custom TTL', async () => {
      cache.set('custom-ttl', { value: 1 }, { ttlMs: 50 });

      // Should exist immediately
      expect(cache.get('custom-ttl')).not.toBeNull();

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 100));

      expect(cache.get('custom-ttl')).toBeNull();
    });

    it('should track hit count', () => {
      cache.set('hit-test', { value: 1 });

      cache.get('hit-test');
      cache.get('hit-test');
      cache.get('hit-test');

      const metadata = cache.getMetadata('hit-test');
      expect(metadata?.hitCount).toBe(3);
    });
  });

  describe('stale-while-revalidate', () => {
    it('should return stale data when enabled', async () => {
      const stwrCache = new ResponseCache(
        createConfig({
          defaultTTLMs: 50,
          staleWhileRevalidate: true,
          staleTTLMs: 100,
        })
      );

      stwrCache.set('stwr-test', { value: 'original' });

      // Wait past TTL but within stale window
      await new Promise((r) => setTimeout(r, 75));

      const result = stwrCache.get<{ value: string }>('stwr-test');

      expect(result).not.toBeNull();
      expect(result?.stale).toBe(true);
      expect(result?.data.value).toBe('original');
    });

    it('should return null after stale window', async () => {
      const stwrCache = new ResponseCache(
        createConfig({
          defaultTTLMs: 50,
          staleWhileRevalidate: true,
          staleTTLMs: 50,
        })
      );

      stwrCache.set('stwr-expired', { value: 1 });

      // Wait past stale window
      await new Promise((r) => setTimeout(r, 150));

      expect(stwrCache.get('stwr-expired')).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete existing entry', () => {
      cache.set('delete-test', { value: 1 });
      expect(cache.delete('delete-test')).toBe(true);
      expect(cache.get('delete-test')).toBeNull();
    });

    it('should return false for nonexistent entry', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired entry', () => {
      cache.set('has-test', { value: 1 });
      expect(cache.has('has-test')).toBe(true);
    });

    it('should return false for nonexistent entry', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entry', async () => {
      const shortCache = new ResponseCache(createConfig({ defaultTTLMs: 50 }));
      shortCache.set('has-expired', { value: 1 });

      await new Promise((r) => setTimeout(r, 100));

      expect(shortCache.has('has-expired')).toBe(false);
    });
  });

  describe('invalidateByTag', () => {
    it('should invalidate entries with matching tag', () => {
      cache.set('tagged-1', { value: 1 }, { tags: ['users'] });
      cache.set('tagged-2', { value: 2 }, { tags: ['users'] });
      cache.set('tagged-3', { value: 3 }, { tags: ['posts'] });

      const count = cache.invalidateByTag('users');

      expect(count).toBe(2);
      expect(cache.get('tagged-1')).toBeNull();
      expect(cache.get('tagged-2')).toBeNull();
      expect(cache.get('tagged-3')).not.toBeNull();
    });

    it('should return 0 for nonexistent tag', () => {
      expect(cache.invalidateByTag('nonexistent')).toBe(0);
    });
  });

  describe('invalidateByPattern', () => {
    it('should invalidate entries matching pattern', () => {
      cache.set('GET:/api/users/1', { value: 1 });
      cache.set('GET:/api/users/2', { value: 2 });
      cache.set('GET:/api/posts/1', { value: 3 });

      const count = cache.invalidateByPattern(/\/api\/users\//);

      expect(count).toBe(2);
      expect(cache.get('GET:/api/users/1')).toBeNull();
      expect(cache.get('GET:/api/posts/1')).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('clear-1', { value: 1 });
      cache.set('clear-2', { value: 2 });

      cache.clear();

      expect(cache.keys()).toHaveLength(0);
      expect(cache.getStats().entries).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track hits and misses', () => {
      cache.set('stats-test', { value: 1 });

      cache.get('stats-test'); // hit
      cache.get('stats-test'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should track entries count', () => {
      cache.set('entry-1', { value: 1 });
      cache.set('entry-2', { value: 2 });

      expect(cache.getStats().entries).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when at capacity', () => {
      const smallCache = new ResponseCache(createConfig({ maxEntries: 3 }));

      smallCache.set('first', { value: 1 });
      smallCache.set('second', { value: 2 });
      smallCache.set('third', { value: 3 });

      // Access first to make it recently used
      smallCache.get('first');

      // Add fourth, should evict second (least recently used)
      smallCache.set('fourth', { value: 4 });

      expect(smallCache.get('first')).not.toBeNull();
      expect(smallCache.get('second')).toBeNull(); // evicted
      expect(smallCache.get('third')).not.toBeNull();
      expect(smallCache.get('fourth')).not.toBeNull();
    });

    it('should track evictions', () => {
      const smallCache = new ResponseCache(createConfig({ maxEntries: 2 }));

      smallCache.set('a', { value: 1 });
      smallCache.set('b', { value: 2 });
      smallCache.set('c', { value: 3 });

      expect(smallCache.getStats().evictions).toBe(1);
    });
  });

  describe('prune', () => {
    it('should remove expired entries', async () => {
      const prunableCache = new ResponseCache(createConfig({ defaultTTLMs: 50 }));

      prunableCache.set('prune-1', { value: 1 });
      prunableCache.set('prune-2', { value: 2 });

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 100));

      // Add one fresh entry
      prunableCache.set('prune-3', { value: 3 }, { ttlMs: 5000 });

      const pruned = prunableCache.prune();

      expect(pruned).toBe(2);
      expect(prunableCache.get('prune-1')).toBeNull();
      expect(prunableCache.get('prune-3')).not.toBeNull();
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      cache.set('key-1', { value: 1 });
      cache.set('key-2', { value: 2 });

      const keys = cache.keys();

      expect(keys).toContain('key-1');
      expect(keys).toContain('key-2');
    });
  });

  describe('getMetadata', () => {
    it('should return entry metadata without data', () => {
      cache.set('meta-test', { secret: 'value' }, { etag: '"abc123"' });

      const metadata = cache.getMetadata('meta-test');

      expect(metadata).not.toBeNull();
      expect(metadata?.etag).toBe('"abc123"');
      expect(metadata).not.toHaveProperty('data');
    });

    it('should return null for nonexistent entry', () => {
      expect(cache.getMetadata('nonexistent')).toBeNull();
    });
  });
});

describe('CacheRegistry', () => {
  const registry = getCacheRegistry();

  beforeEach(() => {
    registry.clearAll();
  });

  it('should create and return caches', () => {
    const cache = registry.getOrCreate('test-connector');
    expect(cache).toBeInstanceOf(ResponseCache);
  });

  it('should return same instance for same ID', () => {
    const cache1 = registry.getOrCreate('same-id');
    const cache2 = registry.getOrCreate('same-id');
    expect(cache1).toBe(cache2);
  });

  it('should remove caches', () => {
    registry.getOrCreate('remove-test');
    registry.remove('remove-test');
    expect(registry.get('remove-test')).toBeUndefined();
  });

  it('should get all stats', () => {
    const cache1 = registry.getOrCreate('conn-1');
    const cache2 = registry.getOrCreate('conn-2');

    cache1.set('key', { value: 1 });
    cache2.set('key', { value: 2 });

    const stats = registry.getAllStats();

    expect(stats).toHaveProperty('conn-1');
    expect(stats).toHaveProperty('conn-2');
  });

  it('should prune all caches', async () => {
    const cache = registry.getOrCreate('prune-test', { defaultTTLMs: 50 });
    cache.set('key', { value: 1 });

    await new Promise((r) => setTimeout(r, 100));

    const pruned = registry.pruneAll();
    expect(pruned).toBe(1);
  });
});
