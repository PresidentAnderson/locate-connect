/**
 * Request/Response Interceptors
 * Middleware pattern for transforming requests and responses
 */

import type { ConnectorRequest, ConnectorResponse } from '@/types';

/**
 * Request context passed through interceptors
 */
export interface RequestContext {
  /** Unique correlation ID for request tracing */
  correlationId: string;
  /** Connector ID making the request */
  connectorId: string;
  /** Start time of the request */
  startTime: number;
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (
  request: ConnectorRequest,
  context: RequestContext
) => ConnectorRequest | Promise<ConnectorRequest>;

/**
 * Response interceptor function type
 */
export type ResponseInterceptor<T = unknown> = (
  response: ConnectorResponse<T>,
  context: RequestContext
) => ConnectorResponse<T> | Promise<ConnectorResponse<T>>;

/**
 * Error interceptor function type
 */
export type ErrorInterceptor = (
  error: Error,
  context: RequestContext
) => Error | ConnectorResponse<unknown> | Promise<Error | ConnectorResponse<unknown>>;

/**
 * Interceptor chain for managing multiple interceptors
 */
export class InterceptorChain {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): this {
    this.requestInterceptors.push(interceptor);
    return this;
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor<T>(interceptor: ResponseInterceptor<T>): this {
    this.responseInterceptors.push(interceptor as ResponseInterceptor);
    return this;
  }

  /**
   * Add an error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): this {
    this.errorInterceptors.push(interceptor);
    return this;
  }

  /**
   * Remove a request interceptor
   */
  removeRequestInterceptor(interceptor: RequestInterceptor): boolean {
    const index = this.requestInterceptors.indexOf(interceptor);
    if (index !== -1) {
      this.requestInterceptors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove a response interceptor
   */
  removeResponseInterceptor<T>(interceptor: ResponseInterceptor<T>): boolean {
    const index = this.responseInterceptors.indexOf(interceptor as ResponseInterceptor);
    if (index !== -1) {
      this.responseInterceptors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Process request through all interceptors
   */
  async processRequest(
    request: ConnectorRequest,
    context: RequestContext
  ): Promise<ConnectorRequest> {
    let processedRequest = request;

    for (const interceptor of this.requestInterceptors) {
      processedRequest = await interceptor(processedRequest, context);
    }

    return processedRequest;
  }

  /**
   * Process response through all interceptors
   */
  async processResponse<T>(
    response: ConnectorResponse<T>,
    context: RequestContext
  ): Promise<ConnectorResponse<T>> {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      processedResponse = (await interceptor(
        processedResponse,
        context
      )) as ConnectorResponse<T>;
    }

    return processedResponse;
  }

  /**
   * Process error through all interceptors
   */
  async processError(
    error: Error,
    context: RequestContext
  ): Promise<Error | ConnectorResponse<unknown>> {
    let result: Error | ConnectorResponse<unknown> = error;

    for (const interceptor of this.errorInterceptors) {
      result = await interceptor(result instanceof Error ? result : new Error(String(result)), context);
      // If interceptor converted error to response, continue with it
    }

    return result;
  }

  /**
   * Clear all interceptors
   */
  clear(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }
}

// ============================================================================
// Built-in Interceptors
// ============================================================================

/**
 * Correlation ID interceptor
 * Adds a unique correlation ID to each request for tracing
 */
export const correlationIdInterceptor: RequestInterceptor = (request, context) => {
  return {
    ...request,
    headers: {
      ...request.headers,
      'X-Correlation-ID': context.correlationId,
      'X-Request-ID': request.id || context.correlationId,
    },
  };
};

/**
 * Logging interceptor factory
 * Creates an interceptor that logs requests and responses
 */
export function createLoggingInterceptor(options?: {
  logBody?: boolean;
  logHeaders?: boolean;
  logger?: (message: string, data?: unknown) => void;
}): {
  request: RequestInterceptor;
  response: ResponseInterceptor;
  error: ErrorInterceptor;
} {
  const log = options?.logger || console.log;
  const logBody = options?.logBody ?? false;
  const logHeaders = options?.logHeaders ?? false;

  return {
    request: (request, context) => {
      const logData: Record<string, unknown> = {
        correlationId: context.correlationId,
        method: request.method,
        path: request.path,
      };

      if (logHeaders) {
        logData.headers = request.headers;
      }
      if (logBody && request.body) {
        logData.body = '[REDACTED]'; // Don't log sensitive data by default
      }

      log(`[${context.connectorId}] Request:`, logData);
      return request;
    },

    response: (response, context) => {
      const duration = Date.now() - context.startTime;
      log(`[${context.connectorId}] Response:`, {
        correlationId: context.correlationId,
        success: response.success,
        statusCode: response.metadata?.statusCode,
        durationMs: duration,
      });
      return response;
    },

    error: (error, context) => {
      const duration = Date.now() - context.startTime;
      log(`[${context.connectorId}] Error:`, {
        correlationId: context.correlationId,
        error: error.message,
        durationMs: duration,
      });
      return error;
    },
  };
}

/**
 * Timing interceptor
 * Adds timing information to response metadata
 */
export const timingResponseInterceptor: ResponseInterceptor = (response, context) => {
  const duration = Date.now() - context.startTime;
  return {
    ...response,
    metadata: {
      ...response.metadata,
      clientDurationMs: duration,
      requestStartTime: context.startTime,
    },
  };
};

/**
 * Content type interceptor
 * Ensures proper content type headers
 */
export const contentTypeInterceptor: RequestInterceptor = (request) => {
  const headers = { ...request.headers };

  // Set default content type for requests with body
  if (request.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Set accept header if not present
  if (!headers['Accept']) {
    headers['Accept'] = 'application/json';
  }

  return { ...request, headers };
};

/**
 * User agent interceptor
 * Adds custom user agent header
 */
export function createUserAgentInterceptor(userAgent: string): RequestInterceptor {
  return (request) => ({
    ...request,
    headers: {
      ...request.headers,
      'User-Agent': userAgent,
    },
  });
}

/**
 * Retry header interceptor
 * Adds retry-related headers from context
 */
export const retryHeaderInterceptor: RequestInterceptor = (request, context) => {
  const headers = { ...request.headers };

  if (context.metadata.retryAttempt) {
    headers['X-Retry-Attempt'] = String(context.metadata.retryAttempt);
  }

  return { ...request, headers };
};

/**
 * Error normalization interceptor
 * Normalizes errors into a consistent format
 */
export const errorNormalizationInterceptor: ErrorInterceptor = (error, context) => {
  // Add correlation ID to error
  (error as any).correlationId = context.correlationId;
  (error as any).connectorId = context.connectorId;

  return error;
};

/**
 * Response transform interceptor factory
 * Creates an interceptor that transforms response data
 */
export function createTransformInterceptor<TInput, TOutput>(
  transform: (data: TInput) => TOutput
): ResponseInterceptor<TOutput> {
  return (response) => {
    if (response.success && response.data) {
      return {
        ...response,
        data: transform(response.data as unknown as TInput),
      };
    }
    return response as ConnectorResponse<TOutput>;
  };
}

/**
 * Sensitive data redaction interceptor
 * Redacts sensitive fields from requests before logging
 */
export function createRedactionInterceptor(
  sensitiveFields: string[]
): RequestInterceptor {
  const redact = (obj: unknown): unknown => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redact(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return (request, context) => {
    // Store redacted body in metadata for logging
    if (request.body) {
      context.metadata.redactedBody = redact(request.body);
    }
    return request;
  };
}

/**
 * Create default interceptor chain with common interceptors
 */
export function createDefaultInterceptorChain(connectorId: string): InterceptorChain {
  const chain = new InterceptorChain();
  const logging = createLoggingInterceptor();

  chain
    .addRequestInterceptor(correlationIdInterceptor)
    .addRequestInterceptor(contentTypeInterceptor)
    .addRequestInterceptor(logging.request)
    .addResponseInterceptor(timingResponseInterceptor)
    .addResponseInterceptor(logging.response)
    .addErrorInterceptor(errorNormalizationInterceptor)
    .addErrorInterceptor(logging.error);

  return chain;
}
