// Shared Sentry bootstrap for all four portals — one implementation, imported
// from each portal's main.jsx. Mirrors the backend pattern in
// backend/utils/errorTracker.js:
//   - no VITE_SENTRY_DSN  → complete no-op (the SDK is not even downloaded:
//     the dynamic import keeps @sentry/browser out of the critical bundle)
//   - DSN set             → init with environment + release tags and mandatory
//     PII scrubbing (children's platform — see shared/utils/piiScrub.js)
//
// shared/components/ErrorBoundary.jsx reports through window.Sentry, which
// this module sets after init.

import { scrubEvent, scrubBreadcrumb } from '../utils/piiScrub.js';

export async function initSentry() {
  const env = import.meta.env ?? {};
  const dsn = env.VITE_SENTRY_DSN;
  if (!dsn) return null;

  const Sentry = await import('@sentry/browser');
  Sentry.init({
    dsn,
    environment: env.MODE || 'development',
    // Netlify/Vercel expose the commit; pass it through as VITE_COMMIT_SHA at build time.
    release: env.VITE_COMMIT_SHA || undefined,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });

  if (typeof window !== 'undefined') window.Sentry = Sentry;
  return Sentry;
}
