import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api';

export function createApi({
  onUnauthenticated = null,
} = {}) {
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
    if (typeof onUnauthenticated === 'function') {
      onUnauthenticated();
    } else {
      window.location.href = '/login';
    }
  };

  api.interceptors.request.use((config) => {
    // No Bearer token injection — cookies are sent automatically via withCredentials
    if (config.data instanceof FormData) delete config.headers['Content-Type'];
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
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
