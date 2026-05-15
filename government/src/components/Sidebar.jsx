import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Building2,
  Star,
  Shield,
  LogOut,
  User,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/government', icon: Home },
    { name: t('nav.schools', { defaultValue: 'Muassasalar' }), href: '/government/schools', icon: Building2 },
    { name: t('nav.ratings', { defaultValue: 'Reytinglar' }), href: '/government/ratings', icon: Star },
    { name: t('nav.platform', { defaultValue: 'Platform' }), href: '/government/platform', icon: LayoutDashboard },
    { name: t('nav.profile', { defaultValue: 'Profil' }), href: '/government/profile', icon: User },
    { name: t('nav.settings', { defaultValue: 'Sozlamalar' }), href: '/government/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 px-6 h-20 bg-primary-600">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-lg font-bold text-white tracking-tight">
          {t('sidebar.title', { defaultValue: 'Davlat Panel' })}
        </h1>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t('nav.menu', { defaultValue: 'Menu' })}
        </p>
        {navigation.map((item) => {
          const Active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2.5 rounded-xl transition-all duration-300 ${
                Active
                  ? 'bg-primary-100 text-primary-600 shadow-sm'
                  : 'text-slate-500 hover:bg-gray-50'
              }`}
              onClick={onClose}
            >
              <item.icon
                className="mr-3 h-5 w-5 transition-colors"
                strokeWidth={Active ? 2 : 1.5}
              />
              <span className="text-sm font-medium">{item.name}</span>
              {Active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-primary-100/25">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm bg-primary-100 text-primary-600">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-primary-600">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs truncate text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout', { defaultValue: 'Chiqish' })}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
