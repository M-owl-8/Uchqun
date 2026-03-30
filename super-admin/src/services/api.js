import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://uchqun-production.up.railway.app/api';
const TOKEN_KEY = 'super_admin_accessToken';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // On 401, redirect to login (no refresh token endpoint)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't redirect for auth endpoints
      const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || 
                            originalRequest?.url?.includes('/auth/logout');
      
      if (!isAuthEndpoint) {
        localStorage.removeItem('superAdminUser');
        localStorage.removeItem(TOKEN_KEY);
        const isLoginPage = window.location.pathname === '/login' || window.location.pathname.startsWith('/login');
        if (!isLoginPage) {
          window.location.href = '/login';
        }
      }
    }

    // On 403, log the error for debugging (dev only)
    if (error.response?.status === 403 && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('403 Forbidden error:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        error: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
