import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api';

export function createApi({
  tokenKey = 'accessToken',
  withCredentials = true,
  onUnauthenticated = null,
} = {}) {
  const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials,
    timeout: 30000,
  });

  // Mutex: single in-flight refresh at a time
  let refreshPromise = null;

  const doRefresh = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 10000 });
    const { accessToken, refreshToken: newRefreshToken } = res.data;
    localStorage.setItem(tokenKey, accessToken);
    if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
    return accessToken;
  };

  const clearAuth = () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (typeof onUnauthenticated === 'function') {
      onUnauthenticated();
    } else {
      window.location.href = '/login';
    }
  };

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
          const accessToken = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
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
