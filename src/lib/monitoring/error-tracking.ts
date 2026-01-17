/**
 * Error tracking and reporting utilities
 * Integrates with Sentry for comprehensive error monitoring
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Error types for categorization
 */
export enum ErrorType {
  JAVASCRIPT = 'javascript',
  API = 'api',
  AUTHENTICATION = 'authentication',
  DATABASE = 'database',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  VALIDATION = 'validation',
  NETWORK = 'network',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * User context for error reporting
 */
export interface UserContext {
  id?: string;
  email?: string;
  role?: string;
  username?: string;
  ip_address?: string;
  anonymize?: boolean;
}

/**
 * Additional context for error tracking
 */
export interface ErrorContext {
  type?: ErrorType;
  severity?: ErrorSeverity;
  route?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;
  fingerprint?: string[];
}

/**
 * Set user context for error tracking
 * @param user User information
 */
export function setUserContext(user: UserContext): void {
  if (!user) return;

  const sentryUser: Sentry.User = {
    id: user.anonymize ? undefined : user.id,
    email: user.anonymize ? undefined : user.email,
    username: user.anonymize ? undefined : user.username,
    ip_address: user.anonymize ? undefined : user.ip_address,
  };

  // Add role as extra context
  if (user.role) {
    Sentry.setTag('user.role', user.role);
  }

  Sentry.setUser(sentryUser);
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking user actions
 * @param message Breadcrumb message
 * @param category Breadcrumb category
 * @param level Severity level
 * @param data Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Track API request as breadcrumb
 * @param method HTTP method
 * @param url Request URL
 * @param statusCode Response status code
 * @param duration Request duration in ms
 */
export function trackApiRequest(
  method: string,
  url: string,
  statusCode?: number,
  duration?: number
): void {
  addBreadcrumb(
    `${method} ${url}`,
    'api',
    statusCode && statusCode >= 400 ? 'error' : 'info',
    {
      method,
      url,
      status_code: statusCode,
      duration_ms: duration,
    }
  );
}

/**
 * Track navigation as breadcrumb
 * @param from Previous route
 * @param to New route
 */
export function trackNavigation(from: string, to: string): void {
  addBreadcrumb(
    `Navigated from ${from} to ${to}`,
    'navigation',
    'info',
    { from, to }
  );
}

/**
 * Track user action as breadcrumb
 * @param action Action name
 * @param target Target element or component
 * @param data Additional data
 */
export function trackUserAction(
  action: string,
  target?: string,
  data?: Record<string, unknown>
): void {
  addBreadcrumb(
    `User ${action}${target ? ` on ${target}` : ''}`,
    'user',
    'info',
    { action, target, ...data }
  );
}

/**
 * Capture an exception with context
 * @param error Error to capture
 * @param context Additional context
 */
export function captureError(
  error: Error | unknown,
  context?: ErrorContext
): string {
  // Set tags if provided
  if (context?.tags) {
    Object.entries(context.tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  // Set type tag
  if (context?.type) {
    Sentry.setTag('error.type', context.type);
  }

  // Set context data
  if (context?.metadata) {
    Sentry.setContext('error_metadata', context.metadata);
  }

  // Set route context
  if (context?.route) {
    Sentry.setTag('route', context.route);
  }

  // Set component context
  if (context?.component) {
    Sentry.setTag('component', context.component);
  }

  // Capture the exception
  const eventId = Sentry.captureException(error, {
    level: context?.severity || 'error',
    fingerprint: context?.fingerprint,
    tags: context?.tags,
  });

  return eventId;
}

/**
 * Capture a message with context
 * @param message Message to capture
 * @param level Severity level
 * @param context Additional context
 */
export function captureMessage(
  message: string,
  level: ErrorSeverity = ErrorSeverity.INFO,
  context?: ErrorContext
): string {
  // Set tags if provided
  if (context?.tags) {
    Object.entries(context.tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  // Set context data
  if (context?.metadata) {
    Sentry.setContext('message_metadata', context.metadata);
  }

  const eventId = Sentry.captureMessage(message, level);
  return eventId;
}

/**
 * Track a performance metric
 * @param name Metric name
 * @param value Metric value
 * @param unit Unit of measurement
 * @param tags Additional tags
 */
export function trackPerformance(
  name: string,
  value: number,
  unit: string = 'millisecond',
  tags?: Record<string, string>
): void {
  // Add as breadcrumb
  addBreadcrumb(
    `Performance: ${name}`,
    'performance',
    'info',
    { name, value, unit, ...tags }
  );

  // Set tags if provided
  if (tags) {
    Object.entries(tags).forEach(([key, val]) => {
      Sentry.setTag(`perf.${key}`, val);
    });
  }
}

/**
 * Start a transaction for performance monitoring
 * @param name Transaction name
 * @param operation Operation type
 * @param data Additional data
 */
export function startTransaction(
  name: string,
  operation: string,
  data?: Record<string, unknown>
): ReturnType<typeof Sentry.startSpan> | undefined {
  return Sentry.startSpan({
    name,
    op: operation,
    data,
  }, (span) => span);
}

/**
 * Wrap an async function with error tracking
 * @param fn Function to wrap
 * @param context Error context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Get the current session/event ID for user reporting
 */
export function getCurrentEventId(): string | undefined {
  return Sentry.lastEventId();
}

/**
 * Show user feedback dialog
 * @param eventId Event ID to attach feedback to
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function showFeedbackDialog(eventId?: string): void {
  if (typeof window === 'undefined') return;

  const client = Sentry.getClient();
  if (!client) return;

  // Use the Sentry feedback integration if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedback = client.getIntegration(Sentry.feedbackIntegration as any);
  if (feedback && 'showDialog' in feedback) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (feedback as any).showDialog();
  }
}

/**
 * Flush pending events (useful before navigation/shutdown)
 * @param timeout Timeout in milliseconds
 */
export async function flush(timeout: number = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

/**
 * Close the Sentry client
 * @param timeout Timeout in milliseconds
 */
export async function close(timeout: number = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}
