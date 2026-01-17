/**
 * Standard API response utilities
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, PaginatedResponse } from '@/types';
import { captureError, captureMessage, ErrorType, ErrorSeverity } from '@/lib/monitoring';

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  headers?: Record<string, string>
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: meta as ApiResponse<T>['meta'],
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create a paginated API response
 */
export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  headers?: Record<string, string>
): NextResponse {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    meta: {
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create an error API response
 */
export function apiError(
  message: string,
  code: string,
  status: number = 400,
  details?: Record<string, unknown>,
  headers?: Record<string, string>
): NextResponse {
  // Track API errors (500+ level) to Sentry
  if (status >= 500) {
    captureMessage(
      `API Error: ${message}`,
      ErrorSeverity.ERROR,
      {
        type: ErrorType.API,
        tags: { error_code: code, status_code: String(status) },
        metadata: details,
      }
    );
  }

  const response: ApiResponse<null> = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };

  return NextResponse.json(response, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create a 400 Bad Request response
 */
export function apiBadRequest(
  message: string,
  code: string = 'bad_request',
  details?: Record<string, unknown>
): NextResponse {
  return apiError(message, code, 400, details);
}

/**
 * Create a 401 Unauthorized response
 */
export function apiUnauthorized(
  message: string = 'Authentication required',
  code: string = 'unauthorized'
): NextResponse {
  return apiError(message, code, 401);
}

/**
 * Create a 403 Forbidden response
 */
export function apiForbidden(
  message: string = 'Access denied',
  code: string = 'forbidden'
): NextResponse {
  return apiError(message, code, 403);
}

/**
 * Create a 404 Not Found response
 */
export function apiNotFound(
  message: string = 'Resource not found',
  code: string = 'not_found'
): NextResponse {
  return apiError(message, code, 404);
}

/**
 * Create a 409 Conflict response
 */
export function apiConflict(
  message: string,
  code: string = 'conflict'
): NextResponse {
  return apiError(message, code, 409);
}

/**
 * Create a 429 Too Many Requests response
 */
export function apiRateLimited(
  retryAfter: number,
  message: string = 'Rate limit exceeded'
): NextResponse {
  return apiError(message, 'rate_limit_exceeded', 429, undefined, {
    'Retry-After': String(retryAfter),
  });
}

/**
 * Create a 500 Internal Server Error response
 */
export function apiServerError(
  message: string = 'Internal server error',
  code: string = 'internal_error',
  error?: Error | unknown
): NextResponse {
  // Capture the actual error if provided
  if (error) {
    captureError(error, {
      type: ErrorType.API,
      tags: { error_code: code },
      metadata: { message },
    });
  }
  
  return apiError(message, code, 500);
}

/**
 * Create a 201 Created response
 */
export function apiCreated<T>(
  data: T,
  headers?: Record<string, string>
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return NextResponse.json(response, {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create a 204 No Content response
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Add rate limit headers to response
 */
export function withRateLimitHeaders(
  response: NextResponse,
  rateLimitHeaders: Record<string, string>
): NextResponse {
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Add CORS headers to response
 */
export function withCorsHeaders(
  response: NextResponse,
  allowedOrigins: string[] = ['*']
): NextResponse {
  const origin = allowedOrigins[0] === '*' ? '*' : allowedOrigins.join(', ');

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

/**
 * Create a CORS preflight response
 */
export function apiCorsOptions(allowedOrigins: string[] = ['*']): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCorsHeaders(response, allowedOrigins);
}
