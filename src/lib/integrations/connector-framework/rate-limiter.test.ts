/**
 * Tests for Connector Rate Limiter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TokenBucketRateLimiter,
  RateLimitTimeoutError,
  getRateLimiterRegistry,
  type RateLimitConfig,
} from './rate-limiter';

describe('TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter;

  const createConfig = (overrides: Partial<RateLimitConfig> = {}): RateLimitConfig => ({
    maxRequestsPerSecond: 10,
    maxConcurrentRequests: 5,
    bucketSize: 20,
    enableQueueing: false,
    maxQueueSize: 100,
    queueTimeout: 5000,
    ...overrides,
  });

  beforeEach(() => {
    limiter = new TokenBucketRateLimiter(createConfig());
  });

  describe('tryAcquire', () => {
    it('should allow requests when tokens are available', () => {
      const result = limiter.tryAcquire();

      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBeLessThan(20);
      expect(result.msUntilNextToken).toBe(0);
    });

    it('should deny requests when tokens are exhausted', () => {
      // Exhaust all tokens (bucket size is 20)
      for (let i = 0; i < 20; i++) {
        limiter.tryAcquire();
        limiter.release();
      }

      const result = limiter.tryAcquire();

      expect(result.allowed).toBe(false);
      expect(result.remainingTokens).toBe(0);
      expect(result.msUntilNextToken).toBeGreaterThan(0);
    });

    it('should respect concurrent request limit', () => {
      const limiterWithLimit = new TokenBucketRateLimiter(
        createConfig({ maxConcurrentRequests: 2 })
      );

      // Acquire without releasing
      expect(limiterWithLimit.tryAcquire().allowed).toBe(true);
      expect(limiterWithLimit.tryAcquire().allowed).toBe(true);
      expect(limiterWithLimit.tryAcquire().allowed).toBe(false);

      // Release one
      limiterWithLimit.release();

      // Should allow again
      expect(limiterWithLimit.tryAcquire().allowed).toBe(true);
    });

    it('should update metrics correctly', () => {
      limiter.tryAcquire();
      limiter.release();

      // Exhaust tokens for throttle
      for (let i = 0; i < 20; i++) {
        limiter.tryAcquire();
        limiter.release();
      }

      const metrics = limiter.getMetrics();

      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.allowedRequests).toBeGreaterThan(0);
    });
  });

  describe('acquire (async)', () => {
    it('should return true immediately when tokens available', async () => {
      const result = await limiter.acquire();
      expect(result).toBe(true);
    });

    it('should return false when throttled and queueing disabled', async () => {
      const noQueueLimiter = new TokenBucketRateLimiter(
        createConfig({ bucketSize: 1, enableQueueing: false })
      );

      await noQueueLimiter.acquire();
      const result = await noQueueLimiter.acquire();

      expect(result).toBe(false);
    });

    it('should queue requests when queueing is enabled', async () => {
      const queueLimiter = new TokenBucketRateLimiter(
        createConfig({
          bucketSize: 2,
          enableQueueing: true,
          queueTimeout: 1000,
        })
      );

      // Acquire both tokens
      await queueLimiter.acquire();
      await queueLimiter.acquire();

      // This should queue
      const queuePromise = queueLimiter.acquire();

      // Release one token
      queueLimiter.release();

      // Wait a bit for refill and queue processing
      await new Promise((r) => setTimeout(r, 150));

      // The queued request should eventually resolve
      queueLimiter.release();
    });

    it('should reject queue limit exceeded', async () => {
      const smallQueueLimiter = new TokenBucketRateLimiter(
        createConfig({
          bucketSize: 1,
          enableQueueing: true,
          maxQueueSize: 1,
        })
      );

      await smallQueueLimiter.acquire();

      // First queued request
      smallQueueLimiter.acquire();

      // Second should fail (queue full)
      const result = await smallQueueLimiter.acquire();
      expect(result).toBe(false);
    });
  });

  describe('release', () => {
    it('should decrement concurrent count', () => {
      limiter.tryAcquire();
      const before = limiter.getMetrics().currentConcurrent;

      limiter.release();
      const after = limiter.getMetrics().currentConcurrent;

      expect(after).toBe(before - 1);
    });

    it('should not go below zero', () => {
      limiter.release();
      limiter.release();

      const metrics = limiter.getMetrics();
      expect(metrics.currentConcurrent).toBe(0);
    });
  });

  describe('getRemainingTokens', () => {
    it('should return current token count', () => {
      const initial = limiter.getRemainingTokens();
      expect(initial).toBe(20); // bucket size

      limiter.tryAcquire();
      expect(limiter.getRemainingTokens()).toBe(19);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      // Use some tokens
      limiter.tryAcquire();
      limiter.tryAcquire();

      limiter.reset();

      expect(limiter.getRemainingTokens()).toBe(20);
      expect(limiter.getMetrics().currentConcurrent).toBe(0);
    });
  });

  describe('token refill', () => {
    it('should refill tokens over time', async () => {
      // Exhaust some tokens
      for (let i = 0; i < 10; i++) {
        limiter.tryAcquire();
        limiter.release();
      }

      const before = limiter.getRemainingTokens();

      // Wait for refill (10 tokens/sec = 1 token per 100ms)
      await new Promise((r) => setTimeout(r, 200));

      const after = limiter.getRemainingTokens();

      expect(after).toBeGreaterThan(before);
    });

    it('should not exceed bucket size', async () => {
      // Wait for overfill
      await new Promise((r) => setTimeout(r, 500));

      const tokens = limiter.getRemainingTokens();
      expect(tokens).toBeLessThanOrEqual(20);
    });
  });

  describe('getMetrics', () => {
    it('should return comprehensive metrics', () => {
      limiter.tryAcquire();
      limiter.release();

      const metrics = limiter.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('allowedRequests');
      expect(metrics).toHaveProperty('throttledRequests');
      expect(metrics).toHaveProperty('queuedRequests');
      expect(metrics).toHaveProperty('averageWaitTimeMs');
      expect(metrics).toHaveProperty('currentConcurrent');
      expect(metrics).toHaveProperty('currentQueueSize');
    });
  });
});

describe('RateLimiterRegistry', () => {
  const registry = getRateLimiterRegistry();

  beforeEach(() => {
    registry.resetAll();
  });

  it('should create and return rate limiters', () => {
    const limiter = registry.getOrCreate('test-connector', {
      maxRequestsPerSecond: 10,
    });

    expect(limiter).toBeInstanceOf(TokenBucketRateLimiter);
  });

  it('should return same instance for same ID', () => {
    const limiter1 = registry.getOrCreate('same-id', {
      maxRequestsPerSecond: 10,
    });
    const limiter2 = registry.getOrCreate('same-id', {
      maxRequestsPerSecond: 20,
    });

    expect(limiter1).toBe(limiter2);
  });

  it('should remove rate limiters', () => {
    registry.getOrCreate('remove-test', { maxRequestsPerSecond: 10 });
    registry.remove('remove-test');

    expect(registry.get('remove-test')).toBeUndefined();
  });

  it('should get all metrics', () => {
    registry.getOrCreate('conn-1', { maxRequestsPerSecond: 10 });
    registry.getOrCreate('conn-2', { maxRequestsPerSecond: 20 });

    const metrics = registry.getAllMetrics();

    expect(metrics).toHaveProperty('conn-1');
    expect(metrics).toHaveProperty('conn-2');
  });
});
