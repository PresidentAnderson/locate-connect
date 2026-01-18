/**
 * Circuit Breaker Implementation
 * Implements the circuit breaker pattern for external API resilience
 */

import type { CircuitBreakerConfig, CircuitBreakerState } from '@/types';

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  lastStateChange: Date;
  totalTrips: number;
}

export interface CircuitBreakerOptions extends CircuitBreakerConfig {
  name: string;
  onStateChange?: (
    from: CircuitBreakerState,
    to: CircuitBreakerState,
    metrics: CircuitBreakerMetrics
  ) => void;
  onTrip?: (metrics: CircuitBreakerMetrics) => void;
  onReset?: (metrics: CircuitBreakerMetrics) => void;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000, // 30 seconds
  monitoringPeriod: 60000, // 1 minute
  halfOpenMaxAttempts: 3,
};

/**
 * Circuit Breaker
 * Prevents cascading failures by stopping requests to failing services
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failures = 0;
  private successes = 0;
  private halfOpenAttempts = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private lastStateChange: Date = new Date();
  private totalTrips = 0;
  private openedAt?: Date;

  private readonly config: CircuitBreakerOptions;
  private monitoringWindow: number[] = [];

  constructor(options: Partial<CircuitBreakerOptions> & { name: string }) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options,
    };
  }

  get name(): string {
    return this.config.name;
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    // Check if we should transition from open to half-open
    if (this.state === 'open' && this.shouldTryHalfOpen()) {
      this.transitionTo('half-open');
    }
    return this.state;
  }

  /**
   * Check if requests are allowed
   */
  isAllowed(): boolean {
    const currentState = this.getState();

    if (currentState === 'closed') {
      return true;
    }

    if (currentState === 'half-open') {
      // Allow limited requests in half-open state
      return this.halfOpenAttempts < this.config.halfOpenMaxAttempts;
    }

    // Open state - not allowed
    return false;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.successes++;
    this.lastSuccess = new Date();
    this.monitoringWindow.push(1);
    this.cleanMonitoringWindow();

    if (this.state === 'half-open') {
      // Check if we should close the circuit
      if (this.successes >= this.config.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(error?: Error): void {
    this.failures++;
    this.lastFailure = new Date();
    this.monitoringWindow.push(0);
    this.cleanMonitoringWindow();

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      // Any failure in half-open trips the circuit back to open
      this.trip();
    } else if (this.state === 'closed') {
      // Check if we should trip the circuit
      if (this.failures >= this.config.failureThreshold) {
        this.trip();
      }
    }
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isAllowed()) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker "${this.name}" is open`,
        this.getMetrics()
      );
    }

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Trip the circuit breaker (open it)
   */
  trip(): void {
    if (this.state !== 'open') {
      this.transitionTo('open');
      this.openedAt = new Date();
      this.totalTrips++;
      this.config.onTrip?.(this.getMetrics());
    }
  }

  /**
   * Reset the circuit breaker (close it)
   */
  reset(): void {
    this.transitionTo('closed');
    this.failures = 0;
    this.successes = 0;
    this.halfOpenAttempts = 0;
    this.openedAt = undefined;
    this.config.onReset?.(this.getMetrics());
  }

  /**
   * Force the circuit breaker to a specific state
   */
  forceState(state: CircuitBreakerState): void {
    this.transitionTo(state);
    if (state === 'closed') {
      this.failures = 0;
      this.successes = 0;
    }
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
      totalTrips: this.totalTrips,
    };
  }

  /**
   * Get failure rate over monitoring period
   */
  getFailureRate(): number {
    if (this.monitoringWindow.length === 0) {
      return 0;
    }
    const failures = this.monitoringWindow.filter((r) => r === 0).length;
    return (failures / this.monitoringWindow.length) * 100;
  }

  /**
   * Check if we should try half-open state
   */
  private shouldTryHalfOpen(): boolean {
    if (!this.openedAt) {
      return false;
    }
    const elapsed = Date.now() - this.openedAt.getTime();
    return elapsed >= this.config.timeout;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    if (oldState === newState) {
      return;
    }

    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === 'half-open') {
      this.halfOpenAttempts = 0;
      this.successes = 0;
    }

    console.log(
      `[CircuitBreaker:${this.name}] State change: ${oldState} -> ${newState}`
    );

    this.config.onStateChange?.(oldState, newState, this.getMetrics());
  }

  /**
   * Clean old entries from monitoring window
   */
  private cleanMonitoringWindow(): void {
    const maxEntries = Math.ceil(
      this.config.monitoringPeriod / 1000 // Assume ~1 request per second max
    );
    if (this.monitoringWindow.length > maxEntries) {
      this.monitoringWindow = this.monitoringWindow.slice(-maxEntries);
    }
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  readonly metrics: CircuitBreakerMetrics;

  constructor(message: string, metrics: CircuitBreakerMetrics) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.metrics = metrics;
  }
}

/**
 * Circuit Breaker Registry - manages multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  getOrCreate(options: Partial<CircuitBreakerOptions> & { name: string }): CircuitBreaker {
    let breaker = this.breakers.get(options.name);
    if (!breaker) {
      breaker = new CircuitBreaker(options);
      this.breakers.set(options.name, breaker);
    }
    return breaker;
  }

  /**
   * Get a circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
