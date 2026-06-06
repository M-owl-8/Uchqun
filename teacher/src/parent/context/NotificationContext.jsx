import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useSocket } from '../../shared/context/SocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { on, off } = useSocket();
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  // Tracks when 429 backoff expires — avoids state re-renders for pause logic
  const pausedUntilRef = useRef(0);

  const loadNotifications = useCallback(async () => {
    if (Date.now() < pausedUntilRef.current) return;
    try {
      const response = await api.get('/notifications/count');
      setCount(response.data.count || 0);
    } catch (err) {
      const status = err?.response?.status;
      // 401 — interceptor already calls clearAuth → isAuthenticated → false → effect tears down
      if (status === 401) return;
      if (status === 429) {
        // Honour Retry-After header; minimum 60 s backoff to avoid hammering the bucket
        const retryAfter = parseInt(err?.response?.headers?.['retry-after'] || '60', 10);
        pausedUntilRef.current = Date.now() + Math.max(retryAfter * 1_000, 60_000);
      }
      setCount(0);
    }
  }, []);

  const loadAllNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data.data || []);
      setCount(response.data.unreadCount || 0);
    } catch (error) {
      setNotifications([]);
      void error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Gate on authentication: zero requests on /login or any unauthenticated route.
  // Also stops immediately when the user logs out (isAuthenticated → false).
  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
    on('notification:new', loadNotifications);
    return () => off('notification:new', loadNotifications);
  }, [isAuthenticated, on, off, loadNotifications]);

  // All exported callbacks MUST be memoized — they are read from useEffect deps
  // by consumers (Dashboard, Notifications page). An unmemoized identity causes
  // an infinite re-render loop in any consumer that lists them as deps.
  const markAsRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) { /* swallowed */ void error; }
  }, [loadNotifications, loadAllNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) { /* swallowed */ void error; }
  }, [loadNotifications, loadAllNotifications]);

  const deleteNotification = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) { /* swallowed */ void error; }
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
