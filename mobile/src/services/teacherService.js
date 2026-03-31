import { api } from './api';
import { extractResponseData } from '../utils/responseHandler';

export const teacherService = {
  // Dashboard
  // Backend returns: { success: true, data: {...} }
  getDashboard: async () => {
    const response = await api.get('/teacher/dashboard');
    return extractResponseData(response);
  },

  // Profile
  // Backend returns: { success: true, data: {...} }
  getProfile: async () => {
    const response = await api.get('/teacher/profile');
    return extractResponseData(response);
  },

  // Responsibilities
  // Backend returns: { success: true, data: [...] }
  getResponsibilities: async () => {
    const response = await api.get('/teacher/responsibilities');
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // Backend returns: { success: true, data: {...} }
  getResponsibilityById: async (id) => {
    const response = await api.get(`/teacher/responsibilities/${id}`);
    return extractResponseData(response);
  },

  // Tasks
  // Backend returns: { success: true, data: [...] }
  getTasks: async () => {
    const response = await api.get('/teacher/tasks');
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // Backend returns: { success: true, data: {...} }
  getTaskById: async (id) => {
    const response = await api.get(`/teacher/tasks/${id}`);
    return extractResponseData(response);
  },

  updateTaskStatus: async (id, status) => {
    const response = await api.put(`/teacher/tasks/${id}/status`, { status });
    return extractResponseData(response);
  },

  // Work History
  // Backend returns: { success: true, data: [...] }
  getWorkHistory: async () => {
    const response = await api.get('/teacher/work-history');
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // Backend returns: { success: true, data: {...} }
  getWorkHistoryById: async (id) => {
    const response = await api.get(`/teacher/work-history/${id}`);
    return extractResponseData(response);
  },

  updateWorkHistoryStatus: async (id, status) => {
    const response = await api.put(`/teacher/work-history/${id}/status`, { status });
    return extractResponseData(response);
  },

  // Child update
  updateChild: async (childId, data) => {
    const response = await api.put(`/child/${childId}`, data);
    return extractResponseData(response);
  },

  // Parents (read-only)
  // Special case: Backend returns { parents: [...], total: N } NOT { success: true, data: ... }
  getParents: async () => {
    const response = await api.get('/teacher/parents');
    const data = response.data;
    // Handle special format: { parents: [...], total: N }
    if (data?.parents) {
      return data.parents;
    }
    // Fallback to standard extraction
    return extractResponseData(response) || [];
  },

  // Backend returns: { success: true, data: {...} }
  getParentById: async (id) => {
    const response = await api.get(`/teacher/parents/${id}`);
    return extractResponseData(response);
  },

  // Messages
  // Backend returns: { success: true, data: [...] }
  getMessages: async () => {
    const response = await api.get('/teacher/messages');
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  sendMessage: async (data) => {
    const response = await api.post('/teacher/message-to-super-admin', data);
    return extractResponseData(response);
  },

  // Emotional Monitoring (backend: GET /teacher/emotional-monitoring/child/:childId, POST /teacher/emotional-monitoring)
  getEmotionalRecords: async (childId) => {
    const response = await api.get(`/teacher/emotional-monitoring/child/${childId}`);
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // All monitoring records (for Monitoring Journal screen)
  getAllMonitoringRecords: async () => {
    const response = await api.get('/teacher/emotional-monitoring');
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  createEmotionalRecord: async (childId, data) => {
    const body = { childId, date: data.date, notes: data.notes, emotionalState: data.emotionalState || {} };
    const response = await api.post('/teacher/emotional-monitoring', body);
    return extractResponseData(response);
  },

  createMonitoringRecord: async (body) => {
    const response = await api.post('/teacher/emotional-monitoring', body);
    return extractResponseData(response);
  },

  updateEmotionalRecord: async (id, data) => {
    const response = await api.put(`/teacher/emotional-monitoring/${id}`, data);
    return extractResponseData(response);
  },

  deleteEmotionalRecord: async (id) => {
    await api.delete(`/teacher/emotional-monitoring/${id}`);
  },

  // Therapy (backend: GET /api/therapy/usage?childId= returns { usages: [...], total })
  getTherapySessions: async (childId) => {
    const response = await api.get('/therapy/usage', { params: { childId } });
    const data = extractResponseData(response);
    const list = data?.usages ?? (Array.isArray(data) ? data : []);
    return Array.isArray(list) ? list : [];
  },

  createTherapySession: async (childId, data) => {
    // Backend: POST /api/therapy/:id/start with body { childId } starts a session; need therapyId
    const therapyId = data.therapyId || data.therapy_id;
    if (therapyId) {
      const response = await api.post(`/therapy/${therapyId}/start`, { childId });
      return extractResponseData(response);
    }
    return null;
  },

  // Groups
  // Backend returns: { success: true, data: [...] }
  getGroups: async () => {
    const response = await api.get('/teacher/groups');
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // Teacher Ratings
  // Backend returns: { success: true, data: [...] }
  getTeacherRatings: async () => {
    const response = await api.get('/teacher/ratings');
    const data = extractResponseData(response);
    return Array.isArray(data) ? data : [];
  },

  // AI Chat
  // Backend returns: { success: true, response: "..." }
  aiChat: async (message, lang = 'en', messages = []) => {
    const response = await api.post('/teacher/ai/chat', {
      message,
      lang,
      messages,
    });
    return response.data;
  },
};
