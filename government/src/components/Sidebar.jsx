import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Star,
  ShieldAlert,
  ClipboardList,
  LayoutGrid,
  User,
  Settings,
  LogOut,
  Globe,
  MapPin,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import ihmaLogo from '@shared/assets/ihma-logo.png';

// Capability required to show a nav item. null = always visible.
// Arrays mean ANY of the listed grants suffices (secondary only needs one to see the tab).
// Students, Teachers, Parents are accessed inside school detail — not top-level nav items.
const NAV_ITEMS = [
  { href: '/government',           labelKey: 'nav.dashboard', icon: LayoutDashboard, capability: null },
  { href: '/government/schools',   labelKey: 'nav.schools',   icon: Building2,       capability: 'canViewSchools' },
  { href: '/government/ratings',   labelKey: 'nav.ratings',   icon: Star,            capability: 'canViewRatings' },
  { href: '/government/warnings',  labelKey: 'nav.warnings',  icon: ShieldAlert,     capability: 'canViewAuditLog' },
  { href: '/government/audit-log', labelKey: 'nav.auditLog',  icon: ClipboardList,   capability: 'canViewAuditLog' },
  {
    href: '/government/platform',
    labelKey: 'nav.platform',
    icon: LayoutGrid,
    // Platform tab contains multiple sub-sections; show it if the account has any platform grant.
    capability: ['canManageAdmins', 'canManageGovernmentUsers', 'canViewMessages', 'canManageRegistrations'],
  },
  { href: '/government/profile',   labelKey: 'nav.profile',   icon: User,     capability: null },
  { href: '/government/settings',  labelKey: 'nav.settings',  icon: Settings, capability: null },
];

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, logout, hasCapability, govType, isRepublic, isRegionAccount } = useAuth();
  const { t, i18n } = useTranslation();
  const canSee = (capability) => {
    if (!capability) return true;
    if (Array.isArray(capability)) return capability.some((c) => hasCapability(c));
    return hasCapability(capability);
  };

  const visibleNav = NAV_ITEMS.filter(({ capability }) => canSee(capability));

  const isActive = (href) => {
    if (href === '/government') {
      return location.pathname === '/government' || location.pathname.startsWith('/government/admin/');
    }
    return location.pathname.startsWith(href);
  };

  const accessLabel = isRepublic
    ? t('sidebar.republic', { defaultValue: 'Republic' })
    : isRegionAccount
      ? t('sidebar.regionAccount', { defaultValue: 'Region' })
      : null;

  const AccessIcon = isRepublic ? Globe : MapPin;

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
            IHMA · O&apos;zbekiston
          </p>
        </div>
      </div>

      {/* Region/republic indicator */}
      {accessLabel && (
        <div className="mx-3 mt-3 px-3 py-1.5 rounded-md bg-sidebar-hover flex items-center gap-2">
          <AccessIcon className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
          <span className="text-[11px] text-sidebar-muted truncate">
            {accessLabel}
            {govType === 'secondary' && (
              <span className="ml-1 opacity-60">
                · {t('sidebar.secondary', { defaultValue: 'secondary' })}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
        {visibleNav.map((item) => {
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
              <span className={active ? 'font-medium' : ''}>
                {t(item.labelKey, { defaultValue: item.labelKey })}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Language dropdown */}
      <div className="px-3 pb-2">
        <LanguageSwitcher variant="sidebar" />
      </div>

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
