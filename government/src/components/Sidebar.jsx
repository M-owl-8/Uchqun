import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Star,
  ShieldAlert,
  LayoutGrid,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ihmaLogo from '@shared/assets/ihma-logo.png';

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.dashboard', { defaultValue: 'Dashboard' }),    href: '/government',          icon: LayoutDashboard },
    { name: t('nav.schools',   { defaultValue: 'Muassasalar' }),  href: '/government/schools',  icon: Building2 },
    { name: t('nav.ratings',   { defaultValue: 'Reytinglar' }),   href: '/government/ratings',   icon: Star },
    { name: t('nav.warnings',  { defaultValue: 'Ogohlantirishlar' }), href: '/government/warnings', icon: ShieldAlert },
    { name: t('nav.platform',  { defaultValue: 'Platform' }),     href: '/government/platform',  icon: LayoutGrid },
    { name: t('nav.profile',   { defaultValue: 'Profil' }),       href: '/government/profile',  icon: User },
    { name: t('nav.settings',  { defaultValue: 'Sozlamalar' }),   href: '/government/settings', icon: Settings },
  ];

  const isActive = (href) =>
    href === '/government'
      ? location.pathname === '/government'
      : location.pathname.startsWith(href);

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar">
      {/* Lockup */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-line flex-shrink-0">
        <img
          src={ihmaLogo}
          alt="IHMA"
          className="h-8 w-8 flex-shrink-0"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">
            {t('sidebar.title', { defaultValue: 'Davlat Panel' })}
          </p>
          <p className="text-[10px] text-sidebar-muted leading-tight truncate">
            IHMA · O'zbekiston
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-sidebar-active text-white border-l-[3px] border-brand-500 pl-[9px]'
                  : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white border-l-[3px] border-transparent pl-[9px]'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2 : 1.5} />
              <span className={active ? 'font-medium' : ''}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="px-3 py-3 border-t border-sidebar-line flex-shrink-0">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-sidebar-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-sidebar-muted hover:text-white hover:bg-sidebar-hover rounded-md transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t('nav.logout', { defaultValue: 'Chiqish' })}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
