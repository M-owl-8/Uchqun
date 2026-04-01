import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return safe defaults instead of throwing
    if (__DEV__) {
      console.warn('[useNotification] Used outside NotificationProvider, returning safe defaults');
    }
    return {
      count: 0,
      notifications: [],
      loading: false,
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      deleteNotification: async () => {},
      refreshNotifications: () => {},
      loadAllNotifications: async () => {},
    };
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0);
      return;
    }
    try {
      const response = await api.get('/notifications/count');
      setCount(response.data?.count || response.data?.data?.count || 0);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading notification count:', error);
      }
      setCount(0);
    }
  }, [isAuthenticated]);

  const loadAllNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      const data = response.data?.data || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
      setCount(response.data?.unreadCount || 0);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading notifications:', error);
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Reset state when not authenticated
      setCount(0);
      setNotifications([]);
      setLoading(false);
      return;
    }

    loadNotifications();
    // Refresh every 60 seconds when authenticated
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
      if (__DEV__) {
        console.error('Error marking notification as read:', error);
      }
    }
  }, [loadNotifications, loadAllNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
      if (__DEV__) {
        console.error('Error marking all as read:', error);
      }
    }
  }, [loadNotifications, loadAllNotifications]);

  const deleteNotification = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
      if (__DEV__) {
        console.error('Error deleting notification:', error);
      }
    }
  }, [loadNotifications, loadAllNotifications]);

  const refreshNotifications = useCallback(() => {
    loadNotifications();
    loadAllNotifications();
  }, [loadNotifications, loadAllNotifications]);

  const value = useMemo(() => ({
    count,
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    loadAllNotifications,
  }), [count, notifications, loading, markAsRead, markAllAsRead, deleteNotification, refreshNotifications, loadAllNotifications]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
