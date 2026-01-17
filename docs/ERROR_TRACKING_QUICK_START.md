# Error Tracking Quick Start Guide

## 5-Minute Setup

### 1. Environment Setup
```bash
# Copy example file
cp .env.local.example .env.local

# Add your Sentry DSN
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
```

### 2. Get a Sentry DSN
1. Sign up at [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Copy the DSN from Settings → Client Keys

### 3. Start Using Error Tracking

#### In API Routes
```typescript
import { apiServerError } from '@/lib/api/response';

export async function GET() {
  try {
    // Your code
  } catch (error) {
    // Automatically tracked!
    return apiServerError('Failed to fetch data', 'fetch_error', error);
  }
}
```

#### In React Components
```tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

export function MyPage() {
  return (
    <ErrorBoundary>
      <YourContent />
    </ErrorBoundary>
  );
}
```

#### Track User Context (on login)
```typescript
import { setUserContext } from '@/lib/monitoring';

setUserContext({
  id: user.id,
  email: user.email,
  role: user.role,
});
```

#### Track Custom Errors
```typescript
import { captureError, ErrorType } from '@/lib/monitoring';

try {
  // Your code
} catch (error) {
  captureError(error, {
    type: ErrorType.DATABASE,
    tags: { feature: 'user-management' },
  });
}
```

#### Track User Actions
```typescript
import { trackUserAction } from '@/lib/monitoring';

trackUserAction('clicked', 'submit-button', { formId: 'contact' });
```

## Common Patterns

### Pattern 1: Database Operations
```typescript
import { captureError, ErrorType } from '@/lib/monitoring';

try {
  await db.update(data);
} catch (error) {
  captureError(error, {
    type: ErrorType.DATABASE,
    metadata: { operation: 'update', table: 'users' },
  });
  throw error;
}
```

### Pattern 2: External API Calls
```typescript
import { captureError, ErrorType } from '@/lib/monitoring';

try {
  const response = await fetch(externalAPI);
  if (!response.ok) throw new Error('API failed');
} catch (error) {
  captureError(error, {
    type: ErrorType.INTEGRATION,
    tags: { api: 'external-service' },
  });
}
```

### Pattern 3: Form Validation
```typescript
import { captureMessage, ErrorSeverity, ErrorType } from '@/lib/monitoring';

if (!isValid) {
  captureMessage('Form validation failed', ErrorSeverity.WARNING, {
    type: ErrorType.VALIDATION,
    metadata: { errors },
  });
}
```

## Best Practices

✅ **DO:**
- Set user context on login
- Clear user context on logout
- Add breadcrumbs for important actions
- Include relevant metadata
- Use appropriate error types

❌ **DON'T:**
- Log sensitive data (passwords, tokens, etc.)
- Capture expected errors (404s, validation failures)
- Spam with too many custom events
- Forget to anonymize PII in production

## Testing

### Test Error Capture
```typescript
import { captureMessage } from '@/lib/monitoring';

// Trigger a test error
captureMessage('Test error from development', 'error', {
  tags: { test: 'true' }
});
```

Check your Sentry dashboard to see if it appears!

## Next Steps

1. ✅ Configure Sentry DSN
2. ✅ Test error capture in development
3. 📖 Read full docs: `docs/ERROR_TRACKING.md`
4. 💡 See examples: `docs/ERROR_TRACKING_EXAMPLES.ts`
5. 🚀 Configure alerts in Sentry dashboard

## Need Help?

- 📚 Full Documentation: [docs/ERROR_TRACKING.md](./ERROR_TRACKING.md)
- 💡 Code Examples: [docs/ERROR_TRACKING_EXAMPLES.ts](./ERROR_TRACKING_EXAMPLES.ts)
- 🔧 Troubleshooting: See ERROR_TRACKING.md § Troubleshooting
- 🌐 Sentry Docs: [docs.sentry.io](https://docs.sentry.io)

## Quick Reference

```typescript
// Import what you need
import {
  captureError,         // Capture exceptions
  captureMessage,       // Capture messages
  setUserContext,       // Set user info
  clearUserContext,     // Clear user info
  trackUserAction,      // Track actions
  trackApiRequest,      // Track API calls
  addBreadcrumb,        // Add breadcrumb
  ErrorType,            // Error categories
  ErrorSeverity,        // Severity levels
} from '@/lib/monitoring';
```

Happy tracking! 🎯
