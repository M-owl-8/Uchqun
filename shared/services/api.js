import axios from 'axios';

import { API_BASE } from './config';

const BASE_URL = API_BASE;

export function createApi({
  onUnauthenticated = null,
  // tokenKey is accepted for backward compatibility with apps that pass
  // it; auth is cookie-based so this argument has no effect.
  // eslint-disable-next-line no-unused-vars
  tokenKey = null,
} = {}) {
  // #04-007 — mutable ref so apps can wire React Router navigate after init
  let _onUnauthenticated = onUnauthenticated;

  const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    // Sends HTTP-only cookies automatically — no localStorage token needed
    withCredentials: true,
    timeout: 30000,
  });

  // Mutex: single in-flight refresh at a time
  let refreshPromise = null;

  const doRefresh = async () => {
    // Cookie-based refresh — backend reads refreshToken from HTTP-only cookie
    await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true, timeout: 10000 });
  };

  const clearAuth = () => {
    // Only user metadata lives in localStorage — tokens are HTTP-only cookies cleared by backend
    localStorage.removeItem('user');
    if (typeof _onUnauthenticated === 'function') {
      _onUnauthenticated();
    } else if (!window.location.pathname.endsWith('/login')) {
      // Guard: don't replace(/login) when already on /login — that causes an
      // infinite full-page reload loop (reload → /auth/me 401 → replace → reload…)
      window.location.replace('/login');
    }
  };

  api.setOnUnauthenticated = (fn) => { _onUnauthenticated = fn; };

  api.interceptors.request.use((config) => {
    // No Bearer token injection — cookies are sent automatically via withCredentials
    if (config.data instanceof FormData) delete config.headers['Content-Type'];
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      // Auth endpoints must never be retried via the refresh flow:
      // - /auth/me: session probe on mount — AuthProvider's .catch() handles it
      // - /auth/login: 401 means wrong credentials, not an expired token
      // - /auth/refresh: refresh itself failed, nothing to retry
      // Retrying any of these would cause an infinite loop or confusing error cascades.
      const url = originalRequest.url || '';
      if (url.includes('/auth/me') || url.includes('/auth/login') || url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
          }
          await refreshPromise;
          return api(originalRequest);
        } catch {
          clearAuth();
          return Promise.reject(error);
        }
      }
      if (error.response?.status === 401) {
        clearAuth();
      }
      return Promise.reject(error);
    }
  );

  return api;
}

// Default instance for backward compatibility
const api = createApi();
export default api;
