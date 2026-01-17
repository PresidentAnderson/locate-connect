/**
 * Example Usage of Error Tracking Features
 * 
 * This file demonstrates how to use the error tracking system
 * in various scenarios across the application.
 */

import { 
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  trackUserAction,
  trackApiRequest,
  trackPerformance,
  withErrorTracking,
  ErrorType,
  ErrorSeverity,
} from '@/lib/monitoring';

/**
 * Example 1: Setting User Context on Login
 */
export function handleUserLogin(user: { id: string; email: string; role: string }) {
  setUserContext({
    id: user.id,
    email: user.email,
    role: user.role,
    anonymize: false, // Set to true in production if needed
  });
  
  // Track the login action
  trackUserAction('login', 'auth-system', {
    method: 'password',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Example 2: Clearing User Context on Logout
 */
export function handleUserLogout() {
  trackUserAction('logout', 'auth-system');
  clearUserContext();
}

/**
 * Example 3: Manual Error Capture with Context
 */
export async function fetchCaseData(caseId: string) {
  try {
    const response = await fetch(`/api/cases/${caseId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch case: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    // Capture the error with full context
    captureError(error, {
      type: ErrorType.API,
      severity: ErrorSeverity.ERROR,
      route: `/api/cases/${caseId}`,
      tags: {
        feature: 'case-management',
        case_id: caseId,
      },
      metadata: {
        endpoint: `/api/cases/${caseId}`,
        timestamp: new Date().toISOString(),
      },
    });
    
    throw error; // Re-throw to handle in UI
  }
}

/**
 * Example 4: Database Error Tracking
 */
export async function saveCaseUpdate(caseId: string, updates: Record<string, unknown>) {
  try {
    // Database operation
    const result = await updateDatabase(caseId, updates);
    return result;
  } catch (error) {
    captureError(error, {
      type: ErrorType.DATABASE,
      severity: ErrorSeverity.ERROR,
      tags: {
        operation: 'update',
        table: 'cases',
      },
      metadata: {
        case_id: caseId,
        update_fields: Object.keys(updates),
      },
    });
    
    throw error;
  }
}

// Mock database function
async function updateDatabase(caseId: string, updates: Record<string, unknown>) {
  // Implementation here
  return { success: true, caseId, updates };
}

/**
 * Example 5: Authentication Error Tracking
 */
export async function handleAuthFailure(reason: string, attemptedUsername?: string) {
  captureMessage(
    `Authentication failed: ${reason}`,
    ErrorSeverity.WARNING,
    {
      type: ErrorType.AUTHENTICATION,
      tags: {
        failure_reason: reason,
      },
      metadata: {
        attempted_username: attemptedUsername,
        timestamp: new Date().toISOString(),
      },
    }
  );
}

/**
 * Example 6: Tracking User Actions with Breadcrumbs
 */
export function trackFormSubmission(formName: string, formData: Record<string, unknown>) {
  addBreadcrumb(
    `Form submitted: ${formName}`,
    'user-action',
    'info',
    {
      form_name: formName,
      field_count: Object.keys(formData).length,
      has_attachments: 'attachments' in formData,
    }
  );
}

/**
 * Example 7: Tracking Button Clicks
 */
export function trackButtonClick(buttonName: string, context?: Record<string, unknown>) {
  trackUserAction('click', buttonName, context);
}

/**
 * Example 8: Performance Tracking
 */
export async function trackDatabaseQueryPerformance(query: string) {
  const startTime = performance.now();
  
  try {
    // Execute query
    const result = await executeDatabaseQuery(query);
    
    const duration = performance.now() - startTime;
    
    // Track performance
    trackPerformance(
      'database-query',
      duration,
      'millisecond',
      {
        query_type: query.split(' ')[0], // SELECT, INSERT, etc.
      }
    );
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    captureError(error, {
      type: ErrorType.DATABASE,
      severity: ErrorSeverity.ERROR,
      metadata: {
        query_duration_ms: duration,
        query: query.substring(0, 100), // First 100 chars only
      },
    });
    
    throw error;
  }
}

// Mock query function
async function executeDatabaseQuery(query: string) {
  // Implementation here
  return { rows: [], query };
}

/**
 * Example 9: Wrapping Async Functions with Error Tracking
 */
export const fetchUserDataWithTracking = withErrorTracking(
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  },
  {
    type: ErrorType.API,
    tags: {
      feature: 'user-management',
    },
  }
);

/**
 * Example 10: Integration Error Tracking (External APIs)
 */
export async function fetchExternalData(endpoint: string) {
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`External API error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    captureError(error, {
      type: ErrorType.INTEGRATION,
      severity: ErrorSeverity.ERROR,
      tags: {
        external_api: new URL(endpoint).hostname,
      },
      metadata: {
        endpoint,
        timestamp: new Date().toISOString(),
      },
    });
    
    throw error;
  }
}

/**
 * Example 11: Validation Error Tracking
 */
export function validateFormData(data: Record<string, unknown>) {
  const errors: string[] = [];
  
  if (!data.name) {
    errors.push('Name is required');
  }
  
  if (!data.email) {
    errors.push('Email is required');
  }
  
  if (errors.length > 0) {
    captureMessage(
      'Form validation failed',
      ErrorSeverity.WARNING,
      {
        type: ErrorType.VALIDATION,
        metadata: {
          errors,
          field_count: Object.keys(data).length,
        },
      }
    );
    
    return { valid: false, errors };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Example 12: Network Error Tracking
 */
export async function handleNetworkRequest(url: string) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;
    
    // Track successful API request
    trackApiRequest('GET', url, response.status, duration);
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track failed request
    trackApiRequest('GET', url, undefined, duration);
    
    captureError(error, {
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.ERROR,
      metadata: {
        url,
        duration_ms: duration,
      },
    });
    
    throw error;
  }
}

/**
 * Example 13: Component-Level Error Boundary Usage
 * 
 * In a React component:
 * 
 * ```tsx
 * import { ErrorBoundary } from '@/components/error/ErrorBoundary';
 * 
 * export function MyComponent() {
 *   return (
 *     <ErrorBoundary>
 *       <YourComponentThatMightThrow />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 */

/**
 * Example 14: Route-Level Error Boundary
 * 
 * Next.js automatically uses error.tsx for route-level errors.
 * Just create error.tsx in your route folder - it's already set up!
 */

/**
 * Example 15: Custom Error Boundary Fallback
 * 
 * ```tsx
 * import { ErrorBoundary } from '@/components/error/ErrorBoundary';
 * 
 * function CustomFallback({ error, resetError }) {
 *   return (
 *     <div>
 *       <h1>Custom Error UI</h1>
 *       <pre>{error.message}</pre>
 *       <button onClick={resetError}>Try Again</button>
 *     </div>
 *   );
 * }
 * 
 * export function MyComponent() {
 *   return (
 *     <ErrorBoundary fallback={CustomFallback}>
 *       <YourComponent />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 */

/**
 * Example 16: App-Wide Error Tracking Provider
 * 
 * In your layout or root component:
 * 
 * ```tsx
 * import { ErrorTrackingProvider } from '@/components/error/ErrorTrackingProvider';
 * 
 * export default function RootLayout({ children, user }) {
 *   return (
 *     <ErrorTrackingProvider user={user}>
 *       {children}
 *     </ErrorTrackingProvider>
 *   );
 * }
 * ```
 */
