/**
 * Retry Handler Implementation
 * Implements exponential backoff with jitter for resilient API calls
 */

import type { RetryPolicy } from '@/types';

export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError?: Error;
  startTime: Date;
  delays: number[];
}

export interface RetryOptions extends Partial<RetryPolicy> {
  onRetry?: (context: RetryContext) => void;
  onSuccess?: (context: RetryContext, result: unknown) => void;
  onFinalFailure?: (context: RetryContext, error: Error) => void;
  shouldRetry?: (error: Error, context: RetryContext) => boolean;
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterEnabled: true,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'NETWORK_ERROR',
    'TIMEOUT',
    '429', // Too Many Requests
    '500', // Internal Server Error
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504', // Gateway Timeout
  ],
};

/**
 * Retry Handler
 * Provides configurable retry logic with exponential backoff
 */
export class RetryHandler {
  private readonly config: RetryPolicy;
  private readonly options: RetryOptions;

  constructor(options: RetryOptions = {}) {
    this.config = {
      ...DEFAULT_RETRY_POLICY,
      ...options,
    };
    this.options = options;
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const context: RetryContext = {
      attempt: 0,
      totalAttempts: this.config.maxAttempts,
      startTime: new Date(),
      delays: [],
    };

    let lastError: Error | undefined;

    while (context.attempt < this.config.maxAttempts) {
      context.attempt++;

      try {
        const result = await fn();
        this.options.onSuccess?.(context, result);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        context.lastError = lastError;

        // Check if we should retry
        const shouldRetry = this.shouldRetry(lastError, context);
        const hasMoreAttempts = context.attempt < this.config.maxAttempts;

        if (shouldRetry && hasMoreAttempts) {
          const delay = this.calculateDelay(context.attempt);
          context.delays.push(delay);

          console.log(
            `[RetryHandler] Attempt ${context.attempt}/${this.config.maxAttempts} failed, ` +
              `retrying in ${delay}ms: ${lastError.message}`
          );

          this.options.onRetry?.(context);
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    // All retries exhausted
    this.options.onFinalFailure?.(context, lastError!);
    throw new RetryExhaustedError(
      `All ${this.config.maxAttempts} retry attempts failed`,
      lastError!,
      context
    );
  }

  /**
   * Execute with a timeout per attempt
   */
  async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return this.execute(async () => {
      return Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new TimeoutError(`Request timeout after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);
    });
  }

  /**
   * Check if an error should trigger a retry
   */
  private shouldRetry(error: Error, context: RetryContext): boolean {
    // Allow custom retry logic
    if (this.options.shouldRetry) {
      return this.options.shouldRetry(error, context);
    }

    // Check if error matches retryable patterns
    return this.isRetryableError(error);
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name;

    // Check against retryable error codes
    for (const code of this.config.retryableErrors) {
      if (
        message.includes(code.toLowerCase()) ||
        name.includes(code) ||
        (error as any).code === code ||
        (error as any).statusCode?.toString() === code
      ) {
        return true;
      }
    }

    // Network-related errors are generally retryable
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('socket')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for a given attempt using exponential backoff
   */
  calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (multiplier ^ (attempt - 1))
    let delay =
      this.config.baseDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Cap at max delay
    delay = Math.min(delay, this.config.maxDelayMs);

    // Add jitter if enabled (random value between 0 and delay)
    if (this.config.jitterEnabled) {
      delay = delay + Math.random() * delay * 0.5;
    }

    return Math.floor(delay);
  }

  /**
   * Get retry configuration
   */
  getConfig(): RetryPolicy {
    return { ...this.config };
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Error thrown when all retries are exhausted
 */
export class RetryExhaustedError extends Error {
  readonly lastError: Error;
  readonly context: RetryContext;

  constructor(message: string, lastError: Error, context: RetryContext) {
    super(message);
    this.name = 'RetryExhaustedError';
    this.lastError = lastError;
    this.context = context;
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Create a retry handler with custom configuration
 */
export function createRetryHandler(options: RetryOptions = {}): RetryHandler {
  return new RetryHandler(options);
}

/**
 * Execute a function with default retry settings
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const handler = new RetryHandler(options);
  return handler.execute(fn);
}

/**
 * Execute a function with retry and timeout per attempt
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  options: RetryOptions = {}
): Promise<T> {
  const handler = new RetryHandler(options);
  return handler.executeWithTimeout(fn, timeoutMs);
}
