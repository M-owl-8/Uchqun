import * as Sentry from '@sentry/node';

// PII scrubbing — this is a children's platform; nothing identifying may leave
// the process in a Sentry event. Mirror implementation for the portals lives at
// shared/utils/piiScrub.js (backend Docker image does not include shared/).

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;

// Field names whose values are redacted wholesale wherever they appear in
// request bodies, extra context, or breadcrumb data. Covers auth material and
// every personal field on users/children (names, contacts, diagnoses, notes).
const SENSITIVE_KEY_RE = /password|token|secret|authorization|cookie|session|email|phone|address|firstname|lastname|fullname|username|dateofbirth|dob|birth|diagnosis|disability|specialneeds|medical|emergency|description|note|message|content|photo|avatar|occupation|snapshot/i;

const scrubString = (value) =>
  value.replace(EMAIL_RE, '[email]').replace(JWT_RE, '[token]');

const deepScrub = (value, depth = 0) => {
  if (depth > 6) return '[depth-limit]';
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => deepScrub(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? '[Filtered]' : deepScrub(val, depth + 1);
    }
    return out;
  }
  return value;
};

// Exported for tests. Returning null drops the event; we never drop, we scrub.
export const scrubEvent = (event) => {
  if (!event || typeof event !== 'object') return event;

  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
      delete event.request.headers['x-migration-secret'];
    }
    if (event.request.data) event.request.data = deepScrub(event.request.data);
    if (typeof event.request.url === 'string') event.request.url = scrubString(event.request.url);
    if (typeof event.request.query_string === 'string') {
      event.request.query_string = scrubString(event.request.query_string);
    }
  }

  // Only the opaque user id is allowed through — never email/username/IP.
  event.user = event.user?.id ? { id: event.user.id } : undefined;

  if (event.extra) event.extra = deepScrub(event.extra);
  if (event.contexts) event.contexts = deepScrub(event.contexts);

  if (Array.isArray(event.breadcrumbs)) {
    for (const crumb of event.breadcrumbs) {
      if (typeof crumb.message === 'string') crumb.message = scrubString(crumb.message);
      if (crumb.data) crumb.data = deepScrub(crumb.data);
    }
  }

  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === 'string') ex.value = scrubString(ex.value);
  }
  if (typeof event.message === 'string') event.message = scrubString(event.message);

  return event;
};

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Railway injects the deployed commit SHA; ties every event to a deploy.
    release: process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || (process.env.NODE_ENV === 'production' ? 0.1 : 1.0),
  });
}

export const captureException = (error, context) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
};

export default Sentry;
