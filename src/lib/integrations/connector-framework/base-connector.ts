/**
 * Base Connector
 * Abstract base class for external API connectors
 */

import type {
  ConnectorConfig,
  ConnectorRequest,
  ConnectorResponse,
  ConnectorError,
  ConnectorState,
  ConnectorMetrics,
  HealthCheckResult,
  IntegrationCategory,
  DecryptedCredential,
} from '@/types';
import { CircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';
import { RetryHandler, RetryExhaustedError } from './retry-handler';
import { createAuthAdapter, type AuthAdapter } from './auth-adapters';

export interface BaseConnectorOptions {
  config: ConnectorConfig;
  category: IntegrationCategory;
}

/**
 * Abstract Base Connector
 * Provides common functionality for all external API connectors
 */
export abstract class BaseConnector {
  readonly id: string;
  readonly name: string;
  readonly type: IntegrationCategory;

  protected config: ConnectorConfig;
  protected state: ConnectorState = 'disconnected';
  protected circuitBreaker: CircuitBreaker;
  protected retryHandler: RetryHandler;
  protected authAdapter?: AuthAdapter;
  protected credential?: DecryptedCredential;

  // Metrics
  protected metrics: ConnectorMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTimeMs: 0,
    circuitBreakerTrips: 0,
    uptime: 100,
  };

  private responseTimes: number[] = [];
  private connectedAt?: Date;

  constructor(options: BaseConnectorOptions) {
    this.config = options.config;
    this.type = options.category;
    this.id = options.config.id;
    this.name = options.config.name;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      name: `${this.name}-cb`,
      ...options.config.circuitBreaker,
      onTrip: () => {
        this.metrics.circuitBreakerTrips++;
        this.state = 'error';
      },
      onReset: () => {
        if (this.connectedAt) {
          this.state = 'connected';
        }
      },
    });

    // Initialize retry handler
    this.retryHandler = new RetryHandler({
      ...options.config.retryPolicy,
      onRetry: (context) => {
        console.log(
          `[${this.name}] Retry attempt ${context.attempt}/${context.totalAttempts}`
        );
      },
    });
  }

  /**
   * Get current state
   */
  getState(): ConnectorState {
    return this.state;
  }

  /**
   * Get configuration
   */
  getConfig(): ConnectorConfig {
    return { ...this.config };
  }

  /**
   * Get metrics
   */
  getMetrics(): ConnectorMetrics {
    // Calculate average response time
    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTimeMs =
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    }

    // Calculate uptime
    if (this.connectedAt) {
      const totalTime = Date.now() - this.connectedAt.getTime();
      const downtime = this.calculateDowntime();
      this.metrics.uptime = ((totalTime - downtime) / totalTime) * 100;
    }

    return { ...this.metrics };
  }

  /**
   * Connect to the external service
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.state = 'connecting';
    console.log(`[${this.name}] Connecting...`);

    try {
      // Initialize auth adapter if not done
      if (!this.authAdapter && this.credential) {
        this.authAdapter = createAuthAdapter(this.config.authType);
        this.authAdapter.configure(this.credential);
      }

      // Perform health check to verify connection
      const health = await this.healthCheck();
      if (!health.healthy) {
        throw new Error(`Health check failed: ${health.message}`);
      }

      this.state = 'connected';
      this.connectedAt = new Date();
      console.log(`[${this.name}] Connected successfully`);
    } catch (error) {
      this.state = 'error';
      console.error(`[${this.name}] Connection failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from the external service
   */
  async disconnect(): Promise<void> {
    if (this.state === 'disconnected') {
      return;
    }

    console.log(`[${this.name}] Disconnecting...`);

    // Clear auth
    this.authAdapter?.clear();
    this.credential = undefined;

    this.state = 'disconnected';
    this.connectedAt = undefined;

    console.log(`[${this.name}] Disconnected`);
  }

  /**
   * Set credentials for authentication
   */
  setCredentials(credential: DecryptedCredential): void {
    this.credential = credential;
    if (this.authAdapter) {
      this.authAdapter.configure(credential);
    }
  }

  /**
   * Execute a request through the connector
   */
  async execute<T>(request: ConnectorRequest): Promise<ConnectorResponse<T>> {
    const startTime = Date.now();
    const requestId = request.id || crypto.randomUUID();

    this.metrics.totalRequests++;

    try {
      // Check circuit breaker
      if (!this.circuitBreaker.isAllowed()) {
        throw new CircuitBreakerOpenError(
          'Circuit breaker is open',
          this.circuitBreaker.getMetrics()
        );
      }

      // Execute with retry logic
      const result = await this.retryHandler.executeWithTimeout(
        () => this.doRequest<T>(request),
        request.timeout || this.config.timeout
      );

      const responseTimeMs = Date.now() - startTime;
      this.recordSuccess(responseTimeMs);

      return {
        success: true,
        data: result,
        metadata: {
          requestId,
          statusCode: 200,
          responseTimeMs,
          retryCount: 0,
          circuitBreakerState: this.circuitBreaker.getState(),
        },
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));

      const connectorError: ConnectorError = {
        code: this.getErrorCode(error),
        message: error instanceof Error ? error.message : String(error),
        statusCode: (error as any).statusCode,
        retryable: this.retryHandler.isRetryableError(
          error instanceof Error ? error : new Error(String(error))
        ),
        timestamp: new Date().toISOString(),
      };

      return {
        success: false,
        error: connectorError,
        metadata: {
          requestId,
          statusCode: connectorError.statusCode || 500,
          responseTimeMs,
          retryCount: (error as RetryExhaustedError)?.context?.attempt || 0,
          circuitBreakerState: this.circuitBreaker.getState(),
        },
      };
    }
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      await this.doHealthCheck();

      const responseTimeMs = Date.now() - startTime;

      return {
        healthy: true,
        status: 'healthy',
        responseTimeMs,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;

      return {
        healthy: false,
        status: 'unhealthy',
        responseTimeMs,
        lastCheck: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Internal method to perform the actual HTTP request
   * Can be overridden by subclasses for custom behavior
   */
  protected async doRequest<T>(request: ConnectorRequest): Promise<T> {
    // Build URL
    const url = new URL(request.path, this.config.baseUrl);

    // Add query parameters
    if (request.queryParams) {
      for (const [key, value] of Object.entries(request.queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    // Build headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...request.headers,
    });

    // Apply authentication
    let finalUrl = url.toString();
    let finalInit: RequestInit = {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    };

    if (this.authAdapter) {
      const authResult = await this.authAdapter.applyToRequest(finalUrl, finalInit);
      finalUrl = authResult.url;
      finalInit = authResult.init;
    }

    // Execute request
    const response = await fetch(finalUrl, finalInit);

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(
        `HTTP ${response.status}: ${response.statusText} - ${errorBody}`
      );
      (error as any).statusCode = response.status;
      throw error;
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as unknown as T;
  }

  /**
   * Internal method to perform health check
   * Should be overridden by subclasses
   */
  protected async doHealthCheck(): Promise<void> {
    // Default implementation: try a simple request
    const response = await fetch(this.config.baseUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok && response.status !== 405) {
      throw new Error(`Health check failed: HTTP ${response.status}`);
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(responseTimeMs: number): void {
    this.metrics.successfulRequests++;
    this.responseTimes.push(responseTimeMs);
    this.metrics.lastRequestAt = new Date().toISOString();
    this.circuitBreaker.recordSuccess();

    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(error: Error): void {
    this.metrics.failedRequests++;
    this.metrics.lastRequestAt = new Date().toISOString();
    this.circuitBreaker.recordFailure(error);
  }

  /**
   * Get error code from an error
   */
  private getErrorCode(error: unknown): string {
    if (error instanceof CircuitBreakerOpenError) {
      return 'CIRCUIT_BREAKER_OPEN';
    }
    if (error instanceof RetryExhaustedError) {
      return 'RETRY_EXHAUSTED';
    }
    if ((error as any).code) {
      return (error as any).code;
    }
    if ((error as any).statusCode) {
      return `HTTP_${(error as any).statusCode}`;
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Calculate downtime (simplified)
   */
  private calculateDowntime(): number {
    // This is a simplified implementation
    // In production, you'd track actual downtime periods
    const failureRate =
      this.metrics.failedRequests /
      Math.max(this.metrics.totalRequests, 1);
    if (!this.connectedAt) return 0;
    return (Date.now() - this.connectedAt.getTime()) * failureRate * 0.1;
  }
}
