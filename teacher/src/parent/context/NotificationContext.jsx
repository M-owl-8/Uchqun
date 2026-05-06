import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications/count');
      setCount(response.data.count || 0);
    } catch (error) {
      setCount(0);
    }
  };

  const loadAllNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data.data || []);
      setCount(response.data.unreadCount || 0);
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
    }
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

