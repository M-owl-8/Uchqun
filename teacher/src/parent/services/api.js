import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    // Add Bearer token from localStorage to all requests
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - redirect to login (no refresh token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't redirect for auth endpoints
      const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || 
                            originalRequest?.url?.includes('/auth/logout');
      
      if (!isAuthEndpoint) {
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        try {
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'sessionExpired' }));
        } catch {
          // ignore
        }
        const isLoginPage = window.location.pathname === '/login' || window.location.pathname.startsWith('/login');
        if (!isLoginPage) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
