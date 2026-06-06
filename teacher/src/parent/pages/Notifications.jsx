import { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useChild } from '../context/ChildContext';
import { useTranslation } from 'react-i18next';
import { formatDateTimeLong } from '@shared/utils/formatDate';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ParentPageHeader from '../components/ParentPageHeader';
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

  

  useEffect(() => {
    loadAllNotifications();
  }, [selectedChildId, loadAllNotifications]);

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
        return 'bg-p-sepia-50 text-p-brand-600';
      case 'meal':
        return 'bg-success-50 text-success-600';
      case 'media':
        return 'bg-p-sepia-50 text-p-brand-600';
      default:
        return 'bg-slate-50 text-slate-600';
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
      <ParentPageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        count={count}
        actions={count > 0 ? (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-[13px] font-medium text-p-brand-700 bg-p-brand-50 hover:bg-p-brand-100 rounded-lg transition-colors"
            type="button"
          >
            {t('notifications.markAllRead')}
          </button>
        ) : null}
      />

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            filter === 'all'
              ? 'bg-p-brand-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t('notifications.filterAll')} ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            filter === 'unread'
              ? 'bg-p-brand-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t('notifications.filterUnread')} ({count})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            filter === 'read'
              ? 'bg-p-brand-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t('notifications.filterRead')} ({notifications.length - count})
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
                  !notification.isRead ? 'bg-p-sepia-50 border-p-sepia-300' : 'bg-p-surface'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${colorClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {notification.message}
                        </p>
                        {notification.child && (
                          <p className="text-xs text-slate-500 mt-2">
                            {notification.child.firstName} {notification.child.lastName}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {formatDateTimeLong(notification.createdAt, i18n.language)}
                        </div>
                      </div>

                      {!notification.isRead && (
                        <span className="px-2 py-1 bg-p-brand-600 text-white text-xs font-bold rounded-full">
                          {t('notifications.new')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-p-surface border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {t('notifications.markAsRead')}
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-p-surface border border-error-200 rounded-lg text-sm font-medium text-error-600 hover:bg-error-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('notifications.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-32 bg-p-surface/95 backdrop-blur-sm">
          <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">
            {filter === 'all'
              ? t('notifications.empty')
              : filter === 'unread'
              ? t('notifications.emptyUnread')
              : t('notifications.emptyRead')}
          </p>
        </Card>
      )}
    </div>
  );
};

export default Notifications;


