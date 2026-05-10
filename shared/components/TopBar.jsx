import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Settings } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const TopBar = ({ onMenuClick, title, notificationsPath = '/notifications', settingsPath = '/settings' }) => {
  const { count } = useNotification();
  const navigate = useNavigate();

  return (
    <header
      role="banner"
      className="fixed top-0 left-0 right-0 h-16 bg-primary-600 z-50 flex items-center justify-between px-4 shadow-md"
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Open menu"
        aria-haspopup="true"
      >
        <Menu className="w-6 h-6" aria-hidden="true" />
      </button>

      {title && (
        <span className="absolute left-1/2 -translate-x-1/2 text-white font-semibold text-sm truncate max-w-[60%]">
          {title}
        </span>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(notificationsPath)}
          className="relative text-white hover:bg-white/20 p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        >
          <Bell className="w-6 h-6" aria-hidden="true" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-primary-600"
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

        <Link
          to={settingsPath}
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
};

export default TopBar;
