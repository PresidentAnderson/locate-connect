/**
 * Connector Rate Limiter
 * Token bucket implementation for per-connector rate limiting
 */

export interface RateLimitConfig {
  /** Maximum requests per second */
  maxRequestsPerSecond: number;
  /** Maximum concurrent requests */
  maxConcurrentRequests?: number;
  /** Bucket size (burst capacity) */
  bucketSize?: number;
  /** Enable request queuing when rate limited */
  enableQueueing?: boolean;
  /** Maximum queue size */
  maxQueueSize?: number;
  /** Queue timeout in ms */
  queueTimeout?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  msUntilNextToken: number;
  queuePosition?: number;
}

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  throttledRequests: number;
  queuedRequests: number;
  averageWaitTimeMs: number;
  currentConcurrent: number;
  currentQueueSize: number;
}

interface QueuedRequest {
  id: string;
  resolve: (result: boolean) => void;
  reject: (error: Error) => void;
  addedAt: number;
  timeout: NodeJS.Timeout;
}

/**
 * Token Bucket Rate Limiter
 * Implements the token bucket algorithm for smooth rate limiting
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private concurrentRequests: number = 0;
  private queue: QueuedRequest[] = [];

  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    allowedRequests: 0,
    throttledRequests: 0,
    queuedRequests: 0,
    averageWaitTimeMs: 0,
    currentConcurrent: 0,
    currentQueueSize: 0,
  };

  private totalWaitTime: number = 0;
  private waitCount: number = 0;

  constructor(private config: RateLimitConfig) {
    // Bucket size defaults to 2x requests per second (burst capacity)
    this.maxTokens = config.bucketSize || config.maxRequestsPerSecond * 2;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();

    // Calculate refill rate (tokens per ms)
    this.refillRate = config.maxRequestsPerSecond / 1000;
  }

  /**
   * Try to acquire a token for a request
   * Returns immediately with whether request is allowed
   */
  tryAcquire(): RateLimitResult {
    this.metrics.totalRequests++;
    this.refillTokens();

    // Check concurrent limit
    if (
      this.config.maxConcurrentRequests &&
      this.concurrentRequests >= this.config.maxConcurrentRequests
    ) {
      this.metrics.throttledRequests++;
      return {
        allowed: false,
        remainingTokens: this.tokens,
        msUntilNextToken: this.getMsUntilNextToken(),
      };
    }

    // Check token availability
    if (this.tokens >= 1) {
      this.tokens -= 1;
      this.concurrentRequests++;
      this.metrics.allowedRequests++;
      this.metrics.currentConcurrent = this.concurrentRequests;

      return {
        allowed: true,
        remainingTokens: Math.floor(this.tokens),
        msUntilNextToken: 0,
      };
    }

    this.metrics.throttledRequests++;
    return {
      allowed: false,
      remainingTokens: 0,
      msUntilNextToken: this.getMsUntilNextToken(),
    };
  }

  /**
   * Acquire a token, waiting if necessary
   * Will queue the request if queueing is enabled
   */
  async acquire(): Promise<boolean> {
    // Try immediate acquisition
    const result = this.tryAcquire();
    if (result.allowed) {
      return true;
    }

    // If queueing is not enabled, return false
    if (!this.config.enableQueueing) {
      return false;
    }

    // Check queue limit
    if (
      this.config.maxQueueSize &&
      this.queue.length >= this.config.maxQueueSize
    ) {
      return false;
    }

    // Queue the request
    return this.queueRequest();
  }

  /**
   * Release a token (call when request completes)
   */
  release(): void {
    if (this.concurrentRequests > 0) {
      this.concurrentRequests--;
      this.metrics.currentConcurrent = this.concurrentRequests;
    }

    // Process queue
    this.processQueue();
  }

  /**
   * Get current metrics
   */
  getMetrics(): RateLimitMetrics {
    return {
      ...this.metrics,
      averageWaitTimeMs:
        this.waitCount > 0 ? this.totalWaitTime / this.waitCount : 0,
      currentQueueSize: this.queue.length,
      currentConcurrent: this.concurrentRequests,
    };
  }

  /**
   * Get remaining tokens
   */
  getRemainingTokens(): number {
    this.refillTokens();
    return Math.floor(this.tokens);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.concurrentRequests = 0;

    // Clear queue
    for (const request of this.queue) {
      clearTimeout(request.timeout);
      request.reject(new Error('Rate limiter reset'));
    }
    this.queue = [];
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Calculate ms until next token is available
   */
  private getMsUntilNextToken(): number {
    if (this.tokens >= 1) return 0;
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  /**
   * Queue a request and wait for availability
   */
  private queueRequest(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const addedAt = Date.now();

      const timeout = setTimeout(() => {
        // Remove from queue
        const index = this.queue.findIndex((r) => r.id === id);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new RateLimitTimeoutError('Request timed out in queue'));
      }, this.config.queueTimeout || 30000);

      const request: QueuedRequest = {
        id,
        resolve,
        reject,
        addedAt,
        timeout,
      };

      this.queue.push(request);
      this.metrics.queuedRequests++;
      this.metrics.currentQueueSize = this.queue.length;
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    while (this.queue.length > 0) {
      const result = this.tryAcquire();
      if (!result.allowed) {
        // Schedule retry
        setTimeout(() => this.processQueue(), result.msUntilNextToken);
        break;
      }

      const request = this.queue.shift()!;
      clearTimeout(request.timeout);

      // Track wait time
      const waitTime = Date.now() - request.addedAt;
      this.totalWaitTime += waitTime;
      this.waitCount++;

      request.resolve(true);
      this.metrics.currentQueueSize = this.queue.length;
    }
  }
}

/**
 * Error thrown when a request times out in the queue
 */
export class RateLimitTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitTimeoutError';
  }
}

/**
 * Error thrown when rate limited and not queueing
 */
export class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public readonly msUntilNextToken: number,
    public readonly remainingTokens: number
  ) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Rate limiter registry for managing multiple connectors
 */
class RateLimiterRegistry {
  private limiters: Map<string, TokenBucketRateLimiter> = new Map();

  /**
   * Get or create a rate limiter for a connector
   */
  getOrCreate(connectorId: string, config: RateLimitConfig): TokenBucketRateLimiter {
    let limiter = this.limiters.get(connectorId);
    if (!limiter) {
      limiter = new TokenBucketRateLimiter(config);
      this.limiters.set(connectorId, limiter);
    }
    return limiter;
  }

  /**
   * Get a rate limiter by connector ID
   */
  get(connectorId: string): TokenBucketRateLimiter | undefined {
    return this.limiters.get(connectorId);
  }

  /**
   * Remove a rate limiter
   */
  remove(connectorId: string): void {
    const limiter = this.limiters.get(connectorId);
    if (limiter) {
      limiter.reset();
      this.limiters.delete(connectorId);
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, RateLimitMetrics> {
    const metrics: Record<string, RateLimitMetrics> = {};
    for (const [id, limiter] of this.limiters) {
      metrics[id] = limiter.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }
}

// Global registry
const globalRateLimiterRegistry = new RateLimiterRegistry();

export function getRateLimiterRegistry(): RateLimiterRegistry {
  return globalRateLimiterRegistry;
}
