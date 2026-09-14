/**
 * Shared media URL resolver.
 *
 * Appwrite-hosted media is stored in `media.url` as a raw Appwrite view URL
 * (see config/storage.js). The bucket is NOT public-read, so the browser cannot
 * fetch it directly — every such URL must be routed through the backend's
 * authenticated proxy, GET /api/v1/media/proxy/:mediaId.
 *
 * The previous implementation (duplicated in teacher/src/pages/media/mediaUtils.js
 * and inline in teacher/src/parent/pages/Media.jsx) built that URL as:
 *
 *     const apiBase = apiUrl.replace('/api', '');
 *     return `${apiBase}/api/media/proxy/${mediaId}`;
 *
 * which was wrong for every value VITE_API_URL actually takes:
 *   - '/api/v1'            -> '/v1/api/media/proxy/…'  (String.replace hits the
 *                             FIRST '/api', so the version segment is orphaned;
 *                             the path then resolves against the PORTAL origin and
 *                             is swallowed by the SPA's /* -> index.html rewrite,
 *                             so the <img> receives HTML and renders broken)
 *   - 'https://host/api'   -> 'https://host/api/media/proxy/…' (no /v1 — the route
 *                             is mounted at /api/v1/media, so this 404s)
 *
 * The effect was that no Appwrite-hosted photo has ever displayed in production;
 * only media rows holding absolute third-party URLs (the pexels/googleapis seed
 * rows) rendered, because those bypass the proxy entirely.
 *
 * This version appends to the API base rather than trying to strip and rebuild
 * it, and normalises a version-less '/api' base to '/api/v1'.
 */

/** Does this URL point at Appwrite storage (and therefore need the proxy)? */
export const isAppwriteUrl = (url) =>
  typeof url === 'string' &&
  url.includes('appwrite.io') &&
  (url.includes('/storage/buckets/') || url.includes('/files/'));

/**
 * Normalise an API base so that appending a route path yields a valid endpoint.
 * Accepts '/api/v1', '/api', 'https://host/api/v1', 'https://host/api'.
 * @param {string} [apiBase]
 * @returns {string} base with no trailing slash, guaranteed to end in /api/vN
 */
export const normalizeApiBase = (apiBase) => {
  let base = String(apiBase ?? '').trim().replace(/\/+$/, '');
  if (!base) base = '/api/v1';
  // A version-less '/api' base predates the /api/v1 mount; point it at v1.
  if (/\/api$/.test(base)) base += '/v1';
  return base;
};

/**
 * Resolve a media record's URL to something the browser can actually load.
 *
 * @param {string} url      - media.url as stored
 * @param {string} mediaId  - the media row's UUID (the proxy keys on this, not the Appwrite file id)
 * @param {string} [apiBase] - API base; defaults to VITE_API_URL
 * @returns {string} a loadable URL (proxy URL for Appwrite media, original otherwise)
 */
export const getProxyUrl = (url, mediaId, apiBase) => {
  if (!url) return url;
  if (!mediaId) return url;
  if (!isAppwriteUrl(url)) return url;

  const base = normalizeApiBase(
    apiBase !== undefined
      ? apiBase
      : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '',
  );

  return `${base}/media/proxy/${mediaId}`;
};

export default getProxyUrl;
