import { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useChild } from '../context/ChildContext';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Bell,
  Activity,
  Utensils,
  Image as ImageIcon,
  CheckCircle2,
  CheckCheck,
  Trash2,
  Calendar,
} from 'lucide-react';

const Notifications = () => {
  const { 
    notifications, 
    loading, 
    count, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    loadAllNotifications 
  } = useNotification();
  const { selectedChildId } = useChild();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState('all'); // all, unread, read

  const locale = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  }[i18n.language] || 'en-US';

  useEffect(() => {
    loadAllNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId]);

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.isRead;
    if (filter === 'read') return notif.isRead;
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'activity':
        return Activity;
      case 'meal':
        return Utensils;
      case 'media':
        return ImageIcon;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'activity':
        return 'bg-blue-50 text-blue-600';
      case 'meal':
        return 'bg-green-50 text-green-600';
      case 'media':
        return 'bg-blue-50 text-blue-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl p-6 md:p-8 shadow-xl border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('notifications.title', { defaultValue: 'Bildirishnomalar' })}</h1>
            <p className="text-white/90 text-sm md:text-base">
              {count > 0 
                ? t('notifications.unreadCount', { count, defaultValue: `${count} ta o'qilmagan bildirishnoma` })
                : t('notifications.allRead', { defaultValue: 'Barcha bildirishnomalar o\'qilgan' })}
            </p>
          </div>
          
          {count > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-bold transition-colors border border-white/30"
            >
              <CheckCheck className="w-4 h-4" />
              {t('notifications.markAllRead', { defaultValue: 'Barchasini o\'qilgan deb belgilash' })}
            </button>
          )}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('notifications.filterAll', { defaultValue: 'Hammasi' })} ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            filter === 'unread'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('notifications.filterUnread', { defaultValue: 'O\'qilmagan' })} ({count})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            filter === 'read'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('notifications.filterRead', { defaultValue: 'O\'qilgan' })} ({notifications.length - count})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const colorClass = getNotificationColor(notification.type);
            
            return (
              <Card
                key={notification.id}
                className={`p-6 transition-all ${
                  !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${colorClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {notification.message}
                        </p>
                        {notification.child && (
                          <p className="text-xs text-gray-500 mt-2">
                            {notification.child.firstName} {notification.child.lastName}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(notification.createdAt).toLocaleString(locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      
                      {!notification.isRead && (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                          {t('notifications.new', { defaultValue: 'Yangi' })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {t('notifications.markAsRead', { defaultValue: 'O\'qilgan deb belgilash' })}
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('notifications.delete', { defaultValue: 'O\'chirish' })}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-32 bg-white/95 backdrop-blur-sm">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold text-lg">
            {filter === 'all' 
              ? t('notifications.empty', { defaultValue: 'Hozircha bildirishnomalar yo\'q' })
              : filter === 'unread'
              ? t('notifications.emptyUnread', { defaultValue: 'O\'qilmagan bildirishnomalar yo\'q' })
              : t('notifications.emptyRead', { defaultValue: 'O\'qilgan bildirishnomalar yo\'q' })}
          </p>
        </Card>
      )}
    </div>
  );
};

export default Notifications;


