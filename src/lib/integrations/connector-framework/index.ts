/**
 * Connector Framework Module
 * External API connector framework with circuit breaker and retry patterns
 */

export {
  BaseConnector,
  type BaseConnectorOptions,
} from './base-connector';

export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerRegistry,
  circuitBreakerRegistry,
  type CircuitBreakerMetrics,
  type CircuitBreakerOptions,
} from './circuit-breaker';

export {
  RetryHandler,
  RetryExhaustedError,
  TimeoutError,
  createRetryHandler,
  withRetry,
  withRetryAndTimeout,
  type RetryContext,
  type RetryOptions,
} from './retry-handler';

export {
  ConnectorFactory,
  getConnectorFactory,
} from './connector-factory';

export {
  ApiKeyAuthAdapter,
  createApiKeyAdapter,
  OAuth2AuthAdapter,
  createOAuth2Adapter,
  BasicAuthAdapter,
  createBasicAuthAdapter,
  createAuthAdapter,
  type AuthAdapter,
  type ApiKeyConfig,
  type OAuth2Config,
  type TokenResponse,
} from './auth-adapters';

export {
  TokenBucketRateLimiter,
  RateLimitTimeoutError,
  RateLimitExceededError,
  getRateLimiterRegistry,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitMetrics,
} from './rate-limiter';

export {
  ResponseCache,
  getCacheRegistry,
  type CacheConfig,
  type CacheEntry,
  type CacheStats,
  type CacheOptions,
} from './response-cache';

export {
  InterceptorChain,
  correlationIdInterceptor,
  createLoggingInterceptor,
  timingResponseInterceptor,
  contentTypeInterceptor,
  createUserAgentInterceptor,
  retryHeaderInterceptor,
  errorNormalizationInterceptor,
  createTransformInterceptor,
  createRedactionInterceptor,
  createDefaultInterceptorChain,
  type RequestContext,
  type RequestInterceptor,
  type ResponseInterceptor,
  type ErrorInterceptor,
} from './interceptors';

export {
  MockConnector,
  createMockConnector,
  type MockResponse,
  type MockRoute,
  type MockConnectorConfig,
} from './mock-connector';
