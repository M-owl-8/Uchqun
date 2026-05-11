import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getUnreadTotalForPrefix } from '../services/chatStore';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const BottomNav = ({ variant = 'bottom', allowed, showLanguageSwitcher = false, showExit = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const _unreadChat = getUnreadTotalForPrefix('parent:', 'teacher');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const defaultNavigation = [
    { name: t('nav.dashboard'), href: '/teacher', icon: Home },
    { name: t('nav.profile'), href: '/teacher/profile', icon: UserCircle },
  ];
  const navigation = (allowed
    ? defaultNavigation.filter((item) => allowed.includes(item.href))
    : defaultNavigation);

  const isActive = (path) => {
    if (path === '/teacher') {
      return location.pathname === '/teacher';
    }
    return location.pathname.startsWith(path);
  };

  const isTop = variant === 'top';

  return (
    <div className={isTop ? 'bg-white border-b border-gray-200 shadow-sm' : 'bg-white border-t border-gray-200 shadow-lg'}>
      <nav
        className={`flex flex-wrap items-center justify-between gap-2 px-2 ${isTop ? 'py-3' : 'py-2'}`}
        style={{ minHeight: isTop ? '68px' : '64px' }}
      >
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex-1 min-w-[72px] max-w-[96px] flex flex-col items-center justify-center h-full rounded-lg transition-colors ${
                active ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <item.icon className={`w-5 h-5 mb-1 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] leading-none font-bold rounded-full px-1.5 py-1 border-2 border-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-medium text-center leading-tight ${active ? 'text-blue-600' : 'text-gray-500'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        {showExit && (
          <button
            onClick={handleLogout}
            className="flex-1 min-w-[72px] max-w-[96px] flex flex-col items-center justify-center h-full transition-colors text-red-600 hover:text-red-700"
            aria-label="Exit"
          >
            <LogOut className="w-5 h-5 mb-1" />
            <span className="text-[11px] font-medium leading-tight">{t('nav.logout')}</span>
          </button>
        )}

        {showLanguageSwitcher && (
          <div className="flex-none">
            <LanguageSwitcher />
          </div>
        )}
      </nav>
    </div>
  );
};

export default BottomNav;

