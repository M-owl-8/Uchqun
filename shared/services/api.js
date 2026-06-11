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

  // DEF-009 — login epoch. Bumped on every successful /auth/login through this
  // instance. A 401 captured before a login must not clear the auth state that
  // login just established: the pre-login bootstrap /auth/me 401s, kicks off a
  // refresh that is still in flight when the user's login succeeds, then the
  // refresh fails (no refresh cookie existed) and clearAuth() wiped the fresh
  // session. Guarding clearAuth on an unchanged epoch removes that race while
  // leaving genuine session-expiry (no intervening login) untouched.
  let authEpoch = 0;

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
    (response) => {
      if ((response.config?.url || '').includes('/auth/login')) authEpoch += 1;
      return response;
    },
    async (error) => {
      const epochAtError = authEpoch;
      // Network-level failures (no server response): create a synthetic response so
      // every component's `err.response?.data?.error` receives a translatable code
      // string instead of Axios's always-English "Network Error" / "timeout" message.
      if (!error.response) {
        const networkCode = error.code === 'ECONNABORTED' ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR';
        error.response = { status: 0, data: { success: false, error: networkCode } };
        return Promise.reject(error); // skip auth retry — no server to retry against
      }

      // Normalize BACKEND-012 error shape: { error: { code, detail } } → { error: string }
      // so every component-level catch block receives a plain string, never [object Object].
      // `code` is preferred over `detail` — `detail` is for Sentry triage only, never shown to users.
      if (
        error.response?.data != null &&
        typeof error.response.data.error === 'object' &&
        error.response.data.error !== null
      ) {
        const e = error.response.data.error;
        error.response.data.error = typeof e.code === 'string' ? e.code
          : typeof e.detail === 'string' ? e.detail
          : JSON.stringify(e);
      }
      // School archived: the school's admin/reception/teacher sessions are revoked immediately.
      // Treat the same as 401 — clear auth and redirect to login without retry.
      if (error.response?.status === 403 && error.response?.data?.error === 'SCHOOL_ARCHIVED') {
        clearAuth();
        return Promise.reject(error);
      }

      const originalRequest = error.config;
      // Auth endpoints that must never be retried:
      // - /auth/login: 401 means wrong credentials, not an expired token
      // - /auth/refresh: refresh itself failed, retrying would loop
      // /auth/me is intentionally NOT excluded — the interceptor transparently
      // refreshes and retries it, and its refreshPromise mutex is shared across
      // all callers on the same api instance (prevents concurrent refresh races).
      const url = originalRequest.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
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
          // Stale failure: a login succeeded while this refresh was in flight —
          // the 401 belongs to the pre-login world; don't clear the new session.
          if (epochAtError === authEpoch) clearAuth();
          return Promise.reject(error);
        }
      }
      if (error.response?.status === 401) {
        if (epochAtError === authEpoch) clearAuth();
      }
      return Promise.reject(error);
    }
  );

  return api;
}

// Default instance for backward compatibility
const api = createApi();
export default api;
