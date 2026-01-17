import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Define how likely traces are sampled. Adjust this value in production.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === "development",
  
  // Configure the environment
  environment: process.env.NODE_ENV || "development",
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  // Edge runtime specific configuration
  enableTracing: true,
});
