import axios from 'axios';
import { API_URL } from '../config';
import { getStoredAuth, storeAuth, clearAuth } from '../storage/authStorage';
import { cacheService } from './cacheService';
import { offlineQueue } from './offlineQueue';

// Log API URL for debugging
if (__DEV__) {
  console.log('[API] Base URL:', API_URL);
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add token and handle FormData
api.interceptors.request.use(async (config) => {
  // Skip adding token for login endpoint
  const isAuthEndpoint = config.url?.includes('/auth/login');

  if (!isAuthEndpoint) {
    const { accessToken } = await getStoredAuth();
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  // If the request data is FormData, set multipart/form-data so React Native XHR appends the boundary
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
    config.timeout = 60000; // 60 seconds for file uploads
  } else if (config.data && typeof config.data === 'object' && config.data.photoBase64) {
    // For base64 photo uploads, ensure proper Content-Type and increase timeout
    config.headers['Content-Type'] = 'application/json';
    config.timeout = 60000;
  }

  if (__DEV__) {
    console.log('[API] Request:', config.method?.toUpperCase(), config.url);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 with token refresh
api.interceptors.response.use(
  (res) => {
    if (__DEV__) {
      console.log('[API] Response:', res.config?.url, res.status);
    }
    return res;
  },
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (__DEV__) {
      console.log('[API] Error:', originalRequest?.url, error.response?.status, error.message);
    }

    // On 401 for non-auth endpoints, try to refresh the token
    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { refreshToken } = await getStoredAuth();
        if (refreshToken) {
          const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;
          if (newAccessToken) {
            const stored = await getStoredAuth();
            await storeAuth({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken || refreshToken,
              user: stored.user,
            });
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        // Refresh failed — clear auth and force re-login
      }
      await clearAuth();
    }
    return Promise.reject(error);
  }
);

// Cache interceptor for GET responses + invalidation on mutations
api.interceptors.response.use(
  async (response) => {
    const method = response.config?.method;
    if (method === 'get' && response.status >= 200 && response.status < 300) {
      try {
        cacheService.set(response.config.url, response.config.params, response.data);
      } catch {}
    } else if (['post', 'put', 'delete', 'patch'].includes(method) && response.status >= 200 && response.status < 300) {
      try {
        await cacheService.clear();
      } catch {}
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    // On network error for GET requests, try cache
    if (!error.response && config?.method === 'get') {
      try {
        const cached = await cacheService.get(config.url, config.params);
        if (cached) {
          const safeConfig = config || { method: 'get', url: '', params: undefined };
          return { data: cached.data, status: 200, config: safeConfig, _fromCache: true, _isStale: cached.isStale };
        }
      } catch {}
    }

    // On network error for mutation requests, queue for later
    if (!error.response && config && ['post', 'put', 'delete', 'patch'].includes(config.method)) {
      try {
        await offlineQueue.add({
          method: config.method,
          url: config.url,
          data: config.data,
          headers: { Authorization: config.headers?.Authorization },
        });
        console.log('[API] Request queued for offline replay:', config.method, config.url);
      } catch {}
    }

    return Promise.reject(error);
  }
);

// Clear cache on logout
api.clearCache = async () => {
  try {
    await cacheService.clear();
  } catch {}
};
