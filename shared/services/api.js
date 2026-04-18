import axios from 'axios';

export function createApi({ tokenKey = 'accessToken', withCredentials = true } = {}) {
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials,
  });

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post(
              `${api.defaults.baseURL}/auth/refresh`,
              { refreshToken }
            );
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            localStorage.setItem(tokenKey, accessToken);
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }
      if (error.response?.status === 401) {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return api;
}

// Default instance for backward compatibility
const api = createApi();
export default api;
