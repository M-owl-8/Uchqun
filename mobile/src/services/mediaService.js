import { api } from './api';
import { API_URL } from '../config';
import { getStoredAuth } from '../storage/authStorage';
import { extractResponseData, extractResponseDataWithFallback } from '../utils/responseHandler';

export const mediaService = {
  // Get media (for both parent and teacher)
  // Backend returns: Direct array [] (no wrapper)
  getMedia: async (params = {}) => {
    const response = await api.get('/media', { params });
    // Direct array format, but handle wrapper if present
    const data = extractResponseDataWithFallback(response, []);
    return Array.isArray(data) ? data : [];
  },

  // Backend returns: Direct object (no wrapper)
  getMediaById: async (id) => {
    const response = await api.get(`/media/${id}`);
    // Direct object format, but handle wrapper if present
    return extractResponseDataWithFallback(response);
  },

  // CRUD operations (teacher only)
  // Backend returns: Direct object
  createMedia: async (data) => {
    const response = await api.post('/media', data);
    // Direct object format
    return extractResponseDataWithFallback(response);
  },

  // Backend returns: Direct object
  // Uses native fetch for file uploads — React Native's fetch has special handling
  // for FormData with { uri, name, type } file objects that axios lacks on Android
  uploadMedia: async (formData) => {
    const { accessToken } = await getStoredAuth();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    try {
      if (__DEV__) console.log('[MediaUpload] Uploading to:', `${API_URL}/media/upload`);
      if (__DEV__) console.log('[MediaUpload] Has token:', !!accessToken);
      const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          // Do NOT set Content-Type — fetch sets multipart boundary automatically
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let data = {};
        try { data = await response.json(); } catch {}
        const error = new Error(data.error || data.message || `Upload failed (${response.status})`);
        error.response = { status: response.status, data };
        throw error;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Try a smaller file or check your connection.');
      }
      throw error;
    }
  },

  // Backend returns: Direct object
  updateMedia: async (id, data) => {
    const response = await api.put(`/media/${id}`, data);
    // Direct object format
    return extractResponseDataWithFallback(response);
  },

  // Backend returns: { success: true, message: ... }
  deleteMedia: async (id) => {
    const response = await api.delete(`/media/${id}`);
    // Handle both wrapper and direct formats
    return extractResponseDataWithFallback(response, { success: true });
  },
};
