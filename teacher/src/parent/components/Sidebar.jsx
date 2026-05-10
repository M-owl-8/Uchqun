import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  UserCircle,
  CheckCircle,
  Utensils,
  Image as ImageIcon,
  MessageCircle,
  Star,
  Bell,
  Settings,
  Heart,
  Building2,
  Lightbulb,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import uzParent from '../locales/uz/common.json';
import ruParent from '../locales/ru/common.json';
import enParent from '../locales/en/common.json';


const COLORS = {
  softNavy: '#2E3A59',
  textTertiary: '#8F9BB3',
  powderBlue: '#E8F4FD',
  mintMist: '#E5F7F0',
  blushPeach: '#FFF0E5',
};

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { count, refreshNotifications } = useNotification();
  const [unreadChat, setUnreadChat] = useState(0);
  
  // Get parent translations directly to avoid merge conflicts
  const parentTranslations = {
    uz: uzParent,
    ru: ruParent,
    en: enParent,
  };
  const currentLang = i18n.language || 'uz';
  const parentT = (key, defaultValue) => {
    const keys = key.split('.');
    let value = parentTranslations[currentLang];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || defaultValue || key;
  };

  // Fetch unread count from dedicated endpoint (single query, no N+1)
  useEffect(() => {
    let alive = true;
    let intervalId;

    const loadUnread = async () => {
      if (!user?.id || !alive) return;
      try {
        const res = await api.get('/chat/unread-count', { params: { role: 'parent' } });
        if (alive) setUnreadChat(res.data.count ?? 0);
      } catch {
        // Non-critical — badge stays at last known value
      }
    };

    loadUnread();
    intervalId = setInterval(loadUnread, 30000); // 30s — lightweight endpoint

    return () => {
      alive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.id]);

  
  const navigation = [
    { name: t('nav.profile'), href: '/child', icon: UserCircle },
    { name: t('nav.activities'), href: '/activities', icon: CheckCircle },
    { name: t('nav.meals'), href: '/meals', icon: Utensils },
    { name: t('nav.media'), href: '/media', icon: ImageIcon },
    { name: t('nav.rating'), href: '/rating', icon: Star },
    { name: t('nav.therapy', { defaultValue: 'Foydali' }), href: '/therapy', icon: Lightbulb },
    { name: t('nav.aiChat'), href: '/ai-chat', icon: Heart },
    { name: t('nav.aiWarnings', { defaultValue: 'AI Warnings' }), href: '/ai-warnings', icon: AlertTriangle },
    { name: t('nav.chat'), href: '/chat', icon: MessageCircle, badge: unreadChat },
    { name: t('nav.notifications', { defaultValue: 'Notifications' }), href: '/notifications', icon: Bell, badge: count },
    { name: t('nav.settings', { defaultValue: 'Sozlamalar' }), href: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-100 shadow-sm">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 h-20" style={{ backgroundColor: COLORS.softNavy }}>
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">U</span>
        </div>
        <h1 className="text-lg font-bold text-white tracking-tight">
          {parentT('sidebar.title', 'Uchqun Parent')}
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textTertiary }}>
          {t('nav.menu')}
        </p>
        {navigation.map((item) => {
          const Active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2.5 rounded-xl transition-all duration-300 ${
                Active ? 'shadow-sm' : 'hover:bg-gray-50'
              }`}
              style={{
                backgroundColor: Active ? COLORS.powderBlue : 'transparent',
                color: Active ? COLORS.softNavy : COLORS.textTertiary,
              }}
              onClick={() => {
                if (item.href === '/notifications') refreshNotifications();
                onClose?.();
              }}
            >
              <div className="relative flex items-center">
                <item.icon
                  className="mr-3 h-5 w-5 transition-colors"
                  strokeWidth={Active ? 2 : 1.5}
                  style={{ color: Active ? COLORS.softNavy : COLORS.textTertiary }}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 text-white text-[10px] leading-none font-extrabold rounded-full px-1.5 py-1 border-2 border-white shadow-sm"
                    style={{ backgroundColor: COLORS.softNavy }}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">{item.name}</span>
              {Active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.softNavy }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-100" style={{ backgroundColor: COLORS.powderBlue + '40' }}>
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm"
            style={{ backgroundColor: COLORS.powderBlue, color: COLORS.softNavy }}>
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: COLORS.softNavy }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs truncate" style={{ color: COLORS.textTertiary }}>{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
