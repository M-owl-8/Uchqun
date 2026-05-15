import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Settings } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const TopBar = ({ onMenuClick }) => {
  const { count } = useNotification();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-primary-500 z-50 flex items-center justify-between px-4 shadow-md">
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
        {/* Bell Icon with Notification Badge */}
        <button
          onClick={() => navigate('/teacher')}
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

        {/* Settings Icon */}
        <Link
          to="/teacher/profile"
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6" />
        </Link>

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

