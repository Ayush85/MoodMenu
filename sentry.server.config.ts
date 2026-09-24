import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Errors are what matter here, not perf tracing — keep sample rate low
  // to avoid needless overhead/cost on every request.
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,
});
