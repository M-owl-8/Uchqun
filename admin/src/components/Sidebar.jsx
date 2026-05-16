import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserRound,
  FileCheck2,
  Archive,
  BellRing,
  BarChart3,
  Activity,
  Building2,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Boshqaruv',
    items: [
      { key: 'nav.dashboard',   href: '/admin',              icon: LayoutDashboard },
      { key: 'nav.receptions',  href: '/admin/receptions',   icon: Users },
      { key: 'nav.teachers',    href: '/admin/teachers',     icon: GraduationCap },
      { key: 'nav.parents',     href: '/admin/parents',      icon: UserRound },
    ],
  },
  {
    label: 'Hujjatlar',
    items: [
      { key: 'nav.documents',   href: '/admin/documents',    icon: FileCheck2, badgeKey: 'pendingDocs' },
      { key: 'nav.archive',     href: '/admin/archive',      icon: Archive },
    ],
  },
  {
    label: 'Hisobotlar',
    items: [
      { key: 'nav.aiWarnings',  href: '/admin/ai-warnings',  icon: BellRing, badgeKey: 'aiWarnings' },
      { key: 'nav.ratings',     href: '/admin/school-ratings', icon: BarChart3 },
      { key: 'nav.auditLog',    href: '/admin/audit',        icon: Activity },
    ],
  },
  {
    label: 'Sozlamalar',
    items: [
      { key: 'nav.school',      href: '/admin/settings',     icon: Building2 },
      { key: 'nav.settings',    href: '/admin/profile',      icon: Settings },
    ],
  },
];

const NavItem = ({ item, isActive, onClick }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-brand-50/10 text-white'
          : 'text-walnut-muted hover:bg-walnut-hover hover:text-white'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-brand-600 rounded-r-sm" />
      )}
      <item.icon
        className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand-300' : ''}`}
        strokeWidth={1.75}
      />
      <span className="text-sm font-medium truncate">{t(item.key, { defaultValue: item.key })}</span>
    </Link>
  );
};

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const isActive = (href) =>
    href === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(href);

  const changeLanguage = (lng) => i18n.changeLanguage(lng);
  const currentLang = i18n.language?.split('-')[0] || 'uz';

  return (
    <div className="flex flex-col h-full bg-walnut text-walnut-text">
      {/* Header */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-surface/15 text-white font-semibold text-base"
            style={{ letterSpacing: '-0.04em' }}
          >
            U
          </span>
          <p className="text-base font-semibold tracking-tight">Uchqun</p>
        </div>

        {/* School logo slot */}
        <div className="mt-4 flex items-center gap-3 p-2.5 bg-walnut-hover rounded-md border border-walnut-divider">
          <div className="w-10 h-10 rounded-md bg-walnut text-brand-400 flex items-center justify-center shrink-0 border border-walnut-divider">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
            {/* TODO(phase-2): replace with actual school logo once upload feature exists */}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.school?.name ?? t('sidebar.school', { defaultValue: 'Maktab' })}</p>
            <p className="text-[11px] text-walnut-muted truncate">{user?.school?.city ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-walnut-muted mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={onClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="m-3 mt-1 p-3 bg-walnut-hover rounded-md border border-walnut-divider">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-sm font-semibold shrink-0">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-walnut-muted truncate">{t('role.admin', { defaultValue: 'Maktab rahbari' })}</p>
          </div>
          <button
            aria-label={t('nav.logout', { defaultValue: 'Chiqish' })}
            onClick={logout}
            className="text-walnut-muted hover:text-white p-1.5 rounded hover:bg-walnut transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Language switcher */}
        <div className="mt-3 grid grid-cols-3 gap-1 bg-walnut rounded-md p-0.5 text-[11px]">
          {['uz', 'ru', 'en'].map((lng) => (
            <button
              key={lng}
              onClick={() => changeLanguage(lng)}
              className={`px-1.5 py-1 rounded-sm font-medium transition-colors ${
                currentLang === lng
                  ? 'bg-surface/10 text-white'
                  : 'text-walnut-muted hover:bg-surface/5'
              }`}
            >
              {lng === 'uz' ? 'UZ' : lng === 'ru' ? 'РУ' : 'EN'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
