# Error Tracking and Reporting (LC-DEBUG-002)

This document describes the comprehensive error tracking and reporting system implemented using Sentry.

## Overview

The error tracking system automatically captures and reports:
- JavaScript exceptions
- API errors (5xx responses)
- Authentication failures
- Database errors
- Integration failures
- Performance issues
- User context and breadcrumb trails

## Setup

### 1. Install Dependencies

Already installed via package.json:
```bash
npm install @sentry/nextjs
```

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```bash
# Required
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug

# Optional but recommended for source maps
SENTRY_AUTH_TOKEN=your-auth-token

# Optional: Release tracking
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
```

### 3. Sentry Project Setup

1. Create a Sentry account at https://sentry.io
2. Create a new project for "Next.js"
3. Copy the DSN from project settings
4. Generate an auth token for source map uploads:
   - Go to Settings → Auth Tokens
   - Create a token with `project:releases` and `org:read` scopes

## Features

### Automatic Error Capture

All uncaught JavaScript errors are automatically captured via:
- Global error boundary (`global-error.tsx`)
- Route-level error boundaries (`error.tsx`)
- `ErrorBoundary` component for granular error handling

### API Error Tracking

API errors (500+ status codes) are automatically tracked when using the response utilities:

```typescript
import { apiServerError } from '@/lib/api/response';

try {
  // ... your code
} catch (error) {
  return apiServerError('Failed to process request', 'processing_error', error);
}
```

### User Context

Set user context to track which users experience errors:

```typescript
import { setUserContext, clearUserContext } from '@/lib/monitoring';

// On login
setUserContext({
  id: user.id,
  email: user.email,
  role: user.role,
  anonymize: false, // Set to true to anonymize PII
});

// On logout
clearUserContext();
```

### Breadcrumb Trails

Track user actions for debugging:

```typescript
import { 
  addBreadcrumb,
  trackApiRequest,
  trackNavigation,
  trackUserAction 
} from '@/lib/monitoring';

// Generic breadcrumb
addBreadcrumb('User viewed profile', 'navigation', 'info', {
  profileId: '123'
});

// API request tracking
trackApiRequest('POST', '/api/cases', 201, 150);

// Navigation tracking
trackNavigation('/dashboard', '/cases/123');

// User action tracking
trackUserAction('clicked', 'submit-button', { formData: {...} });
```

### Manual Error Capture

Capture errors manually with context:

```typescript
import { captureError, ErrorType, ErrorSeverity } from '@/lib/monitoring';

try {
  // ... your code
} catch (error) {
  captureError(error, {
    type: ErrorType.DATABASE,
    severity: ErrorSeverity.ERROR,
    route: '/api/cases',
    metadata: {
      query: 'SELECT * FROM cases',
      params: { id: 123 }
    },
    tags: {
      feature: 'case-management',
      environment: 'production'
    }
  });
}
```

### Performance Monitoring

Track performance metrics:

```typescript
import { trackPerformance, startTransaction } from '@/lib/monitoring';

// Simple metric
trackPerformance('api-response-time', 250, 'millisecond', {
  endpoint: '/api/cases'
});

// Transaction-based tracking
const transaction = startTransaction('case-creation', 'db.query');
// ... perform operation
transaction?.finish();
```

### Error Boundary Component

Wrap components with error boundaries:

```tsx
import { ErrorBoundary, withErrorBoundary } from '@/components/error/ErrorBoundary';

// Using component
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// Using HOC
export default withErrorBoundary(YourComponent);
```

### Error Tracking Provider

Automatic tracking of navigation and API requests:

```tsx
import { ErrorTrackingProvider } from '@/components/error/ErrorTrackingProvider';

<ErrorTrackingProvider user={currentUser}>
  <YourApp />
</ErrorTrackingProvider>
```

## Error Types

The system categorizes errors into types:

- `JAVASCRIPT` - Client-side JavaScript errors
- `API` - API endpoint errors
- `AUTHENTICATION` - Auth failures
- `DATABASE` - Database errors
- `INTEGRATION` - Third-party integration errors
- `PERFORMANCE` - Performance issues
- `VALIDATION` - Data validation errors
- `NETWORK` - Network connectivity errors

## Context Included in Reports

Each error report includes:

### User Context
- User ID (with anonymization option)
- Email (with anonymization option)
- User role
- Username
- IP address (optional)

### Environment Context
- Browser/device information
- Operating system
- Screen resolution
- User agent

### Application Context
- Current route/URL
- Component name
- Error type
- Custom tags
- Custom metadata

### Breadcrumb Trail
- Navigation history (last 100)
- API requests (method, URL, status, duration)
- User actions (clicks, form submissions, etc.)
- Console logs (info, warning, error)

### Session Information
- Session duration
- Recent actions
- Performance metrics
- Device/browser info

## Source Maps

Source maps are automatically uploaded during production builds when `SENTRY_AUTH_TOKEN` is configured. This allows you to see the original TypeScript/JSX code in error stack traces instead of minified JavaScript.

## Release Tracking

Set `NEXT_PUBLIC_SENTRY_RELEASE` to track which version of your code errors occur in:

```bash
NEXT_PUBLIC_SENTRY_RELEASE=$(git rev-parse HEAD)
```

Or use semantic versioning:
```bash
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
```

## Alert Configuration

Configure alerts in Sentry dashboard:

1. Go to Alerts → Create Alert
2. Choose conditions (e.g., error frequency, new issues)
3. Set notification channels (email, Slack, PagerDuty)
4. Configure alert rules per environment

## Error Grouping

Sentry automatically groups similar errors. You can customize grouping with fingerprints:

```typescript
captureError(error, {
  fingerprint: ['database', 'connection-timeout', '{{ default }}']
});
```

## Testing

Run tests:
```bash
npm test -- error-tracking
```

Test error capture in development:
```typescript
import { captureMessage } from '@/lib/monitoring';

// Trigger a test error
captureMessage('Test error message', 'error', {
  tags: { test: 'true' }
});
```

## Best Practices

1. **Always provide context** - Include relevant metadata and tags
2. **Use appropriate severity levels** - Don't mark everything as fatal
3. **Anonymize PII** - Use the `anonymize` flag for sensitive data
4. **Add breadcrumbs** - Help debug by tracking user journey
5. **Set user context** - Know which users are affected
6. **Use error types** - Categorize errors for better filtering
7. **Test in development** - Verify error capture before production
8. **Monitor quota** - Sentry has event limits on free plans
9. **Filter noise** - Ignore expected errors (configured in sentry.*.config.ts)
10. **Review regularly** - Check Sentry dashboard for trends

## Privacy Considerations

- User data can be anonymized with the `anonymize` flag
- Sensitive data is automatically scrubbed from breadcrumbs
- Source maps are hidden from public view
- IP addresses can be excluded from tracking

## Performance Impact

- Client bundle size: ~50KB (gzipped)
- Performance overhead: <5ms per request
- Source map upload: Only during build
- Sample rates configured for production (10% traces, 10% replays)

## Troubleshooting

### Errors not appearing in Sentry

1. Check DSN is correct
2. Verify `NEXT_PUBLIC_SENTRY_DSN` is set
3. Check browser console for Sentry init errors
4. Ensure not in development with `debug: true`

### Source maps not working

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check build logs for upload errors
3. Ensure release matches between client and server

### Too many events

1. Adjust sample rates in `sentry.*.config.ts`
2. Add errors to `ignoreErrors` list
3. Use `beforeSend` to filter events

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Integration Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Tracking Best Practices](https://docs.sentry.io/product/issues/)
