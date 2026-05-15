import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from './SocketContext';

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
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications/count');
      setCount(response.data.count || 0);
    } catch {
      setCount(0);
    }
  };

  const loadAllNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data.data || []);
      setCount(response.data.unreadCount || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    on('notification:new', loadNotifications);
    return () => off('notification:new', loadNotifications);
  }, [on, off]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await loadNotifications();
      await loadAllNotifications();
    } catch { /* swallowed */ }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      await loadNotifications();
      await loadAllNotifications();
    } catch { /* swallowed */ }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      await loadNotifications();
      await loadAllNotifications();
    } catch { /* swallowed */ }
  };

  const refreshNotifications = () => {
    loadNotifications();
    loadAllNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        count,
        notifications,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        loadAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
