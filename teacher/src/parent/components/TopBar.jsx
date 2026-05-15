import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, User, Star, MessageCircle } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { getUnreadCount } from '../../shared/services/chatStore';

const TopBar = ({ onMenuClick }) => {
  const { count, refreshNotifications } = useNotification();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const unreadChat = user?.id ? getUnreadCount(`parent:${user.id}`, 'parent') : 0;
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-primary-500 z-50 flex items-center justify-between px-4 shadow-md">
      {/* Hamburger Menu - Not needed on desktop since sidebar is always visible */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}
      {!onMenuClick && <div className="w-10" />}

      {/* Right Side Icons */}
      <div className="flex items-center gap-2">
        {/* Profile */}
        <Link
          to="/child"
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          aria-label={t('nav.profile')}
          title={t('nav.profile')}
        >
          <User className="w-6 h-6" />
        </Link>

        {/* Rating / Feedback */}
        <Link
          to="/rating"
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          aria-label={t('nav.rating')}
          title={t('nav.rating')}
        >
          <Star className="w-6 h-6" />
        </Link>

        {/* Chat with teacher */}
        <Link
          to="/chat"
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          aria-label={t('nav.chat')}
          title={t('nav.chat')}
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {unreadChat > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] leading-none font-bold rounded-full px-1.5 py-1 border-2 border-primary-500">
                {unreadChat > 9 ? '9+' : unreadChat}
              </span>
            )}
          </div>
        </Link>

        <LanguageSwitcher />
        {/* Bell Icon with Notification Badge */}
        <button
          onClick={() => {
            refreshNotifications();
            navigate('/notifications');
          }}
          className="relative text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-primary-500">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

        {/* Exit/Logout Button */}
        <button
          onClick={handleLogout}
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          aria-label="Exit"
          title="Exit"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default TopBar;

