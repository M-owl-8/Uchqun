import { api } from './api';
import { extractResponseData } from '../utils/responseHandler';

export const notificationService = {
  // Get notifications
  // Custom extraction: Backend returns { success: true, data: [...], unreadCount: N, total: N }
  // We need unreadCount and total metadata alongside the data array, so we cannot use
  // the generic extractResponseData helper which only returns the data field.
  getNotifications: async (params = {}) => {
    try {
      const response = await api.get('/notifications', { params });
      const data = response.data;
      
      // Extract data array and metadata
      return {
        data: Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []),
        unreadCount: data?.unreadCount || 0,
        total: data?.total || 0,
      };
    } catch (error) {
      if (__DEV__) console.error('[notificationService] Error getting notifications:', error);
      // Return safe defaults instead of throwing
      return {
        data: [],
        unreadCount: 0,
        total: 0,
      };
    }
  },

  // Get unread count
  // Backend returns: { success: true, count: N }
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/count');
      const data = response.data;
      // Extract count from { success: true, count: N }
      return data?.count || 0;
    } catch (error) {
      if (__DEV__) console.error('[notificationService] Error getting unread count:', error);
      return 0;
    }
  },

  // Mark as read
  // Backend returns: { success: true, message: ... }
  markAsRead: async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return extractResponseData(response);
    } catch (error) {
      if (__DEV__) console.error('[notificationService] Error marking notification as read:', error);
      throw error; // Re-throw for UI to handle
    }
  },

  // Mark all as read
  // Backend returns: { success: true, message: ... }
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return extractResponseData(response);
    } catch (error) {
      if (__DEV__) console.error('[notificationService] Error marking all as read:', error);
      throw error; // Re-throw for UI to handle
    }
  },

  // Delete notification
  // Backend returns: { success: true, message: ... }
  deleteNotification: async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return extractResponseData(response);
    } catch (error) {
      if (__DEV__) console.error('[notificationService] Error deleting notification:', error);
      throw error; // Re-throw for UI to handle
    }
  },
};
