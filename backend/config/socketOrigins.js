/**
 * C-07 — Socket.IO CORS origin allowlist builder.
 *
 * Production: FRONTEND_URL (comma-separated) is the allowlist; if unset, fall
 * back to the four production portal origins. NEVER a wildcard, NEVER
 * localhost in production — Socket.IO runs with credentials: true, so a
 * localhost origin in the production list would let any page served from a
 * victim's local machine open a credentialed socket.
 *
 * Non-production: localhost dev ports + production origins + env extras.
 *
 * Kept free of model/DB imports so tests can import it directly.
 */

export const SOCKET_LOCALHOST_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5177',
];

export const SOCKET_PRODUCTION_ORIGINS = [
  'https://teacher-production-0647.up.railway.app',
  'https://reception-production-ba41.up.railway.app',
  'https://admin-production-536f.up.railway.app',
  'https://government-production.up.railway.app',
];

export function computeSocketOrigins({ nodeEnv, frontendUrl } = {}) {
  const isProduction = nodeEnv === 'production';
  const envOrigins = frontendUrl
    ? frontendUrl.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  if (isProduction) {
    return envOrigins.length > 0 ? envOrigins : [...SOCKET_PRODUCTION_ORIGINS];
  }
  return [...new Set([...SOCKET_LOCALHOST_ORIGINS, ...SOCKET_PRODUCTION_ORIGINS, ...envOrigins])];
}
