import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home,
  Users,
  UserCircle,
  CheckCircle,
  Utensils,
  Image as ImageIcon,
  MessageCircle,
  Settings,
  Heart,
  Music,
} from 'lucide-react';
import { useAuth } from '../shared/context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../shared/services/api';
import LanguageSwitcher from './LanguageSwitcher';

const UNREAD_POLL_MS = 30000; // 30s — lightweight endpoint, no N+1

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [unreadChat, setUnreadChat] = useState(0);

  // Fetch unread count from the dedicated endpoint (single query, no N+1)
  useEffect(() => {
    let alive = true;
    let intervalId;

    const loadUnread = async () => {
      if (!alive) return;
      try {
        const res = await api.get('/chat/unread-count', { params: { prefix: 'parent:', role: 'teacher' } });
        if (alive) setUnreadChat(res.data.count ?? 0);
      } catch {
        // Non-critical — badge stays at last known value
      }
    };

    loadUnread();
    intervalId = setInterval(loadUnread, UNREAD_POLL_MS);

    return () => {
      alive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const navigation = [
    { name: t('nav.dashboard'), href: '/teacher', icon: Home },
    { name: t('nav.parents'), href: '/teacher/parents', icon: Users },
    { name: t('nav.profile') || 'Profile', href: '/teacher/profile', icon: UserCircle },
    { name: t('nav.activities'), href: '/teacher/activities', icon: CheckCircle },
    { name: t('nav.meals'), href: '/teacher/meals', icon: Utensils },
    { name: t('nav.media'), href: '/teacher/media', icon: ImageIcon },
    { name: t('nav.monitoring', { defaultValue: 'Monitoring' }), href: '/teacher/monitoring', icon: Heart },
    { name: t('nav.therapy', { defaultValue: 'Terapiya' }), href: '/teacher/therapy', icon: Music },
    { name: t('nav.chat'), href: '/teacher/chat', icon: MessageCircle, badge: unreadChat },
    { name: t('nav.settings', { defaultValue: 'Sozlamalar' }), href: '/teacher/settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/teacher') {
      return location.pathname === '/teacher';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 px-6 h-20 bg-sidebar-navy">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <h1 className="text-lg font-bold text-white tracking-tight">
          {t('sidebar.title', { defaultValue: 'Uchqun Teacher' })}
        </h1>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
          {t('nav.menu')}
        </p>
        {navigation.map((item) => {
          const Active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2.5 rounded-xl transition-all duration-300 ${
                Active
                  ? 'bg-sidebar-blue text-sidebar-navy shadow-sm'
                  : 'text-sidebar-muted hover:bg-gray-50'
              }`}
              onClick={onClose}
            >
              <div className="relative flex items-center">
                <item.icon
                  className="mr-3 h-5 w-5 transition-colors"
                  strokeWidth={Active ? 2 : 1.5}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] leading-none font-bold rounded-full px-1.5 py-1 border-2 border-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">{item.name}</span>
              {Active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-navy" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-sidebar-blue/25">
        <div className="px-2 mb-3">
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm bg-sidebar-blue text-sidebar-navy">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-sidebar-navy">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs truncate text-sidebar-muted">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
