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
