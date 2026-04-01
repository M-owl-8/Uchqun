import { api } from './api';
import { extractResponseData } from '../utils/responseHandler';

export const parentService = {
  // Get children
  // Backend returns: { success: true, data: children }
  getChildren: async () => {
    const response = await api.get('/parent/children');
    return extractResponseData(response) || [];
  },

  // Get child by ID (uses /api/child/:id endpoint)
  getChildById: async (id) => {
    const response = await api.get(`/child/${id}`);
    return extractResponseData(response);
  },

  // Get activities
  // Backend returns: { success: true, data: activities.rows, total, limit, offset }
  getActivities: async (params = {}) => {
    const response = await api.get('/parent/activities', { params });
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // Backend returns: { success: true, data: activity }
  getActivityById: async (id) => {
    const response = await api.get(`/parent/activities/${id}`);
    return extractResponseData(response);
  },

  // Get meals
  // Backend returns: { success: true, data: meals.rows, total, limit, offset }
  getMeals: async (params = {}) => {
    const response = await api.get('/parent/meals', { params });
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // Backend returns: { success: true, data: meal }
  getMealById: async (id) => {
    const response = await api.get(`/parent/meals/${id}`);
    return extractResponseData(response);
  },

  // Get media
  // Backend returns: { success: true, data: media.rows, total, limit, offset }
  getMedia: async (params = {}) => {
    const response = await api.get('/parent/media', { params });
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // Backend returns: { success: true, data: media }
  getMediaById: async (id) => {
    const response = await api.get(`/parent/media/${id}`);
    return extractResponseData(response);
  },

  // Get profile
  // Backend returns: { success: true, data: {...} }
  getProfile: async () => {
    const response = await api.get('/parent/profile');
    return extractResponseData(response);
  },

  // Ratings
  getSchoolRating: async () => {
    const response = await api.get('/parent/school-rating');
    return extractResponseData(response);
  },

  rateSchool: async (data) => {
    const response = await api.post('/parent/school-rating', data);
    return extractResponseData(response);
  },

  getSchools: async () => {
    const response = await api.get('/parent/schools');
    return extractResponseData(response);
  },

  // AI Chat
  aiChat: async (message, lang = 'uz', messages = []) => {
    const historyForRequest = messages.slice(-8);
    const response = await api.post('/parent/ai/chat', {
      message,
      lang,
      messages: historyForRequest.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    });
    return extractResponseData(response);
  },

  // Messages
  // Backend returns: { success: true, data: [...] }
  // 404 is normal (no messages yet) - don't log as error
  getMessages: async () => {
    try {
      const response = await api.get('/parent/messages');
      const data = extractResponseData(response);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // 404 means no messages yet - this is normal, not an error
      if (error.response?.status === 404) {
        return [];
      }
      // Only log non-404 errors
      if (__DEV__) console.error('[parentService] Error getting messages:', error);
      return [];
    }
  },

  sendMessage: async (data) => {
    const response = await api.post('/parent/message-to-super-admin', data);
    return extractResponseData(response);
  },
};
