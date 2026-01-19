/**
 * Mock Connector
 * A configurable mock connector for testing and development
 */

import type {
  ConnectorConfig,
  ConnectorRequest,
  ConnectorResponse,
  HealthCheckResult,
} from '@/types';
import { BaseConnector, type BaseConnectorOptions } from './base-connector';

/**
 * Mock response configuration
 */
export interface MockResponse<T = unknown> {
  /** Response data */
  data: T;
  /** HTTP status code */
  statusCode?: number;
  /** Response delay in ms */
  delay?: number;
  /** Whether to throw an error instead */
  error?: Error | string;
  /** Response headers */
  headers?: Record<string, string>;
}

/**
 * Mock route configuration
 */
export interface MockRoute {
  /** HTTP method to match */
  method?: string;
  /** Path pattern (supports * wildcard) */
  pathPattern: string;
  /** Response or function to generate response */
  response: MockResponse | ((request: ConnectorRequest) => MockResponse | Promise<MockResponse>);
  /** Number of times this route can be matched (-1 for unlimited) */
  times?: number;
}

/**
 * Mock connector configuration
 */
export interface MockConnectorConfig {
  /** Default response delay in ms */
  defaultDelay?: number;
  /** Default response for unmatched routes */
  defaultResponse?: MockResponse;
  /** Simulated failure rate (0-1) */
  failureRate?: number;
  /** Simulate network errors */
  simulateNetworkErrors?: boolean;
  /** Health check result */
  healthStatus?: HealthCheckResult;
  /** Initial routes */
  routes?: MockRoute[];
}

/**
 * Mock Connector for Testing
 * Allows configuring responses for different routes
 */
export class MockConnector extends BaseConnector {
  private mockConfig: MockConnectorConfig;
  private routes: MockRoute[] = [];
  private routeCallCounts: Map<string, number> = new Map();
  private requestHistory: Array<{ request: ConnectorRequest; timestamp: number }> = [];
  private customHealthStatus?: HealthCheckResult;

  constructor(
    options: BaseConnectorOptions,
    mockConfig: MockConnectorConfig = {}
  ) {
    super(options);

    this.mockConfig = {
      defaultDelay: mockConfig.defaultDelay ?? 50,
      defaultResponse: mockConfig.defaultResponse ?? { data: { success: true } },
      failureRate: mockConfig.failureRate ?? 0,
      simulateNetworkErrors: mockConfig.simulateNetworkErrors ?? false,
      healthStatus: mockConfig.healthStatus,
      routes: [],
    };

    // Add initial routes
    if (mockConfig.routes) {
      for (const route of mockConfig.routes) {
        this.addRoute(route);
      }
    }

    this.customHealthStatus = mockConfig.healthStatus;
  }

  /**
   * Add a mock route
   */
  addRoute(route: MockRoute): this {
    this.routes.push({
      ...route,
      times: route.times ?? -1,
    });
    return this;
  }

  /**
   * Remove a route by pattern
   */
  removeRoute(pathPattern: string, method?: string): boolean {
    const index = this.routes.findIndex(
      (r) => r.pathPattern === pathPattern && (!method || r.method === method)
    );
    if (index !== -1) {
      this.routes.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all routes
   */
  clearRoutes(): void {
    this.routes = [];
    this.routeCallCounts.clear();
  }

  /**
   * Set a simple response for a path
   */
  onGet<T>(path: string, response: T | MockResponse<T>): this {
    return this.addRoute({
      method: 'GET',
      pathPattern: path,
      response: this.normalizeResponse(response),
    });
  }

  /**
   * Set a POST response for a path
   */
  onPost<T>(path: string, response: T | MockResponse<T>): this {
    return this.addRoute({
      method: 'POST',
      pathPattern: path,
      response: this.normalizeResponse(response),
    });
  }

  /**
   * Set a PUT response for a path
   */
  onPut<T>(path: string, response: T | MockResponse<T>): this {
    return this.addRoute({
      method: 'PUT',
      pathPattern: path,
      response: this.normalizeResponse(response),
    });
  }

  /**
   * Set a DELETE response for a path
   */
  onDelete<T>(path: string, response: T | MockResponse<T>): this {
    return this.addRoute({
      method: 'DELETE',
      pathPattern: path,
      response: this.normalizeResponse(response),
    });
  }

  /**
   * Set any method response for a path
   */
  onAny<T>(path: string, response: T | MockResponse<T>): this {
    return this.addRoute({
      pathPattern: path,
      response: this.normalizeResponse(response),
    });
  }

  /**
   * Set health status
   */
  setHealthStatus(status: HealthCheckResult): void {
    this.customHealthStatus = status;
  }

  /**
   * Get request history
   */
  getRequestHistory(): Array<{ request: ConnectorRequest; timestamp: number }> {
    return [...this.requestHistory];
  }

  /**
   * Get the last request
   */
  getLastRequest(): ConnectorRequest | undefined {
    return this.requestHistory[this.requestHistory.length - 1]?.request;
  }

  /**
   * Get requests matching a pattern
   */
  getRequestsMatching(pathPattern: string, method?: string): ConnectorRequest[] {
    const regex = this.patternToRegex(pathPattern);
    return this.requestHistory
      .filter(
        ({ request }) =>
          regex.test(request.path) && (!method || request.method === method)
      )
      .map(({ request }) => request);
  }

  /**
   * Clear request history
   */
  clearHistory(): void {
    this.requestHistory = [];
  }

  /**
   * Verify a request was made
   */
  wasRequestMade(pathPattern: string, method?: string): boolean {
    return this.getRequestsMatching(pathPattern, method).length > 0;
  }

  /**
   * Get number of times a route was called
   */
  getCallCount(pathPattern: string, method?: string): number {
    const key = `${method || '*'}:${pathPattern}`;
    return this.routeCallCounts.get(key) || 0;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.clearRoutes();
    this.clearHistory();
    this.routeCallCounts.clear();
    this.customHealthStatus = undefined;
  }

  /**
   * Internal method to perform the mock request
   */
  protected async doRequest<T>(request: ConnectorRequest): Promise<T> {
    // Record request
    this.requestHistory.push({ request, timestamp: Date.now() });

    // Simulate network error
    if (this.mockConfig.simulateNetworkErrors && Math.random() < 0.1) {
      throw new Error('Network error: Connection refused');
    }

    // Simulate random failure
    if (
      this.mockConfig.failureRate &&
      Math.random() < this.mockConfig.failureRate
    ) {
      const error = new Error('Simulated random failure');
      (error as any).statusCode = 500;
      throw error;
    }

    // Find matching route
    const route = this.findMatchingRoute(request);

    // Get response
    const mockResponse = route
      ? await this.getRouteResponse(route, request)
      : this.mockConfig.defaultResponse!;

    // Track call count
    if (route) {
      const key = `${route.method || '*'}:${route.pathPattern}`;
      this.routeCallCounts.set(key, (this.routeCallCounts.get(key) || 0) + 1);

      // Remove route if times limit reached
      if (route.times !== -1) {
        route.times!--;
        if (route.times! <= 0) {
          const index = this.routes.indexOf(route);
          if (index !== -1) {
            this.routes.splice(index, 1);
          }
        }
      }
    }

    // Apply delay
    const delay = mockResponse.delay ?? this.mockConfig.defaultDelay;
    if (delay && delay > 0) {
      await this.sleep(delay);
    }

    // Check for error
    if (mockResponse.error) {
      const error =
        typeof mockResponse.error === 'string'
          ? new Error(mockResponse.error)
          : mockResponse.error;
      (error as any).statusCode = mockResponse.statusCode || 500;
      throw error;
    }

    return mockResponse.data as T;
  }

  /**
   * Internal method to perform health check
   */
  protected async doHealthCheck(): Promise<void> {
    if (this.customHealthStatus) {
      if (!this.customHealthStatus.healthy) {
        throw new Error(this.customHealthStatus.message || 'Health check failed');
      }
      return;
    }

    // Default healthy
    await this.sleep(10);
  }

  /**
   * Find a matching route for a request
   */
  private findMatchingRoute(request: ConnectorRequest): MockRoute | undefined {
    for (const route of this.routes) {
      // Check method
      if (route.method && route.method !== request.method) {
        continue;
      }

      // Check path pattern
      const regex = this.patternToRegex(route.pathPattern);
      if (regex.test(request.path)) {
        return route;
      }
    }
    return undefined;
  }

  /**
   * Get response from route
   */
  private async getRouteResponse(
    route: MockRoute,
    request: ConnectorRequest
  ): Promise<MockResponse> {
    if (typeof route.response === 'function') {
      return route.response(request);
    }
    return route.response;
  }

  /**
   * Convert path pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Convert * to match any characters
    const regexPattern = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * Normalize response to MockResponse format
   */
  private normalizeResponse<T>(response: T | MockResponse<T>): MockResponse<T> {
    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      (response as MockResponse<T>).data !== undefined
    ) {
      return response as MockResponse<T>;
    }
    return { data: response as T };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a mock connector with default configuration
 */
export function createMockConnector(
  name: string = 'mock-connector',
  mockConfig?: MockConnectorConfig
): MockConnector {
  const config: ConnectorConfig = {
    id: `mock-${name}-${Date.now()}`,
    integrationId: `integration-${name}`,
    name,
    enabled: true,
    baseUrl: 'https://mock.api.local',
    timeout: 5000,
    keepAlive: true,
    authType: 'api_key',
    credentialId: `credential-${name}`,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      monitoringPeriod: 60000,
      halfOpenMaxAttempts: 3,
    },
    retryPolicy: {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
    },
    rateLimit: {
      maxRequestsPerSecond: 100,
      maxConcurrentRequests: 10,
    },
  };

  return new MockConnector(
    {
      config,
      category: 'custom',
    },
    mockConfig
  );
}
