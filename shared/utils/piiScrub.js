// PII scrubbing for Sentry events — children's platform, nothing identifying
// may leave the browser in an event payload. Mirror implementation for the
// backend lives at backend/utils/errorTracker.js (the backend Docker image
// does not include shared/, so the logic is intentionally duplicated).

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;

const SENSITIVE_KEY_RE = /password|token|secret|authorization|cookie|session|email|phone|address|firstname|lastname|fullname|username|dateofbirth|dob|birth|diagnosis|disability|specialneeds|medical|emergency|description|note|message|content|photo|avatar|occupation|snapshot/i;

export const scrubString = (value) =>
  value.replace(EMAIL_RE, '[email]').replace(JWT_RE, '[token]');

export const deepScrub = (value, depth = 0) => {
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

// beforeSend hook. Returning null would drop the event; we never drop, we scrub.
export const scrubEvent = (event) => {
  if (!event || typeof event !== 'object') return event;

  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
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

// beforeBreadcrumb hook — fetch/xhr/console crumbs can carry emails in URLs
// (e.g. login payload echoes) or console noise with user data.
export const scrubBreadcrumb = (crumb) => {
  if (!crumb || typeof crumb !== 'object') return crumb;
  if (typeof crumb.message === 'string') crumb.message = scrubString(crumb.message);
  if (crumb.data) crumb.data = deepScrub(crumb.data);
  return crumb;
};
