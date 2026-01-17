import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Define how likely traces are sampled. Adjust this value in production.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === "development",
  
  // Capture Replay for 10% of all sessions,
  // plus 100% of sessions with an error
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  // Configure the environment
  environment: process.env.NODE_ENV || "development",
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  // Ignore specific errors
  ignoreErrors: [
    // Browser extension errors
    'Non-Error promise rejection captured',
    // Network errors that are expected
    'NetworkError',
    'Failed to fetch',
    // Abort errors
    'AbortError',
  ],
  
  // Filter out localhost and internal URLs from breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      const url = breadcrumb.data?.url;
      if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return null;
      }
    }
    return breadcrumb;
  },
});
