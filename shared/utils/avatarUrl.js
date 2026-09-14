/**
 * Shared avatar / photo URL resolver.
 *
 * Single source of truth for turning a stored `users.avatar` or `children.photo`
 * value into something safe to put in an `<img src>`.
 *
 * Why this exists: since migration `20260423000000-avatar-text-column.js` the
 * backend stores avatars as **base64 data URIs** in a TEXT column
 * (`controllers/userController.js` builds `data:<mime>;base64,<...>`), because
 * Railway's filesystem is ephemeral. Every portal had independently written
 *
 *     avatar.startsWith('http') ? avatar : API_BASE + '/' + avatar
 *
 * which fails that test for a `data:` URI and produces
 * `https://api.example.com/data:image/png;base64,...` — a guaranteed broken
 * image. This helper treats already-absolute values (data:, blob:, http:,
 * https:, and protocol-relative //) as final, and only prefixes genuine
 * server-relative paths.
 *
 * Usage:
 *   import { resolveAvatarUrl } from '@shared/utils/avatarUrl';
 *   <img src={resolveAvatarUrl(user.avatar)} />
 *
 * Do NOT reimplement this inline in a component.
 */

/** Values that are already complete and must be passed through untouched. */
const ABSOLUTE_RE = /^(data:|blob:|https?:\/\/|\/\/)/i;

/**
 * Strip a trailing `/api` or `/api/v1` (any version) from an API base URL to
 * get the server origin that static/relative asset paths hang off.
 * @param {string} apiBase
 * @returns {string}
 */
export const apiOriginFrom = (apiBase) =>
  String(apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/, '');

/**
 * Resolve a stored avatar/photo value to a usable `<img src>`.
 *
 * @param {string|null|undefined} value - stored avatar/photo (data URI, absolute URL, or server-relative path)
 * @param {string} [apiBase] - API base URL; defaults to `VITE_API_URL`
 * @returns {string|null} a usable src, or null when there is nothing to show
 */
export const resolveAvatarUrl = (value, apiBase) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // data: / blob: / http(s): / protocol-relative are already complete.
  if (ABSOLUTE_RE.test(trimmed)) return trimmed;

  // Anything else is a server-relative path (e.g. "/uploads/media/x.jpg").
  const base =
    apiBase !== undefined
      ? apiBase
      : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';

  const origin =
    apiOriginFrom(base) ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

export default resolveAvatarUrl;
