// Centralised runtime configuration. Each Vite app requires VITE_API_URL
// at production-build time, so the fallback only matters in dev (where
// the per-app vite.config typically proxies /api anyway).

const FALLBACK_API_BASE = 'http://localhost:5000/api';

export const API_BASE = import.meta.env?.VITE_API_URL || FALLBACK_API_BASE;

// API_HOST is the API URL with the trailing /api stripped, used to build
// absolute URLs to /uploads/* media served from the same origin.
export const API_HOST = API_BASE.replace(/\/api\/?$/, '');
