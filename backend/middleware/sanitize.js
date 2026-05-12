import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize a string by stripping all HTML tags.
 * Uses sanitize-html for robust, spec-compliant sanitization.
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Recursively sanitize all string values in an object.
 * visited WeakSet prevents infinite recursion on circular references.
 */
function sanitize(obj, visited = new WeakSet()) {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, visited));
  }
  if (obj && typeof obj === 'object') {
    if (visited.has(obj)) return obj;
    visited.add(obj);
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = sanitize(value, visited);
    }
    return cleaned;
  }
  return obj;
}

/**
 * Express middleware that sanitizes all string fields in req.body.
 */
export const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  next();
};
