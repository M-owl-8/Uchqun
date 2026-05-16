import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UsersRound,
  FolderOpen,
  Settings,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();

  const navigation = [
    { name: t('nav.dashboard'), href: '/reception', icon: LayoutDashboard },
    { name: t('nav.parents'), href: '/reception/parents', icon: Users },
    { name: t('nav.teachers'), href: '/reception/teachers', icon: GraduationCap },
    { name: t('nav.groups'), href: '/reception/groups', icon: UsersRound },
    { name: t('nav.documents', { defaultValue: 'Mening hujjatlarim' }), href: '/reception/documents', icon: FolderOpen },
  ];

  const secondaryNav = [
    { name: t('nav.settings', { defaultValue: 'Sozlamalar' }), href: '/reception/settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/reception') return location.pathname === '/reception';
    return location.pathname.startsWith(path);
  };

  const initials = `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`;
  const langs = ['UZ', 'RU', 'EN'];
  const currentLang = (i18n.language || 'uz').toUpperCase().slice(0, 2);

  const handleLang = (lang) => {
    i18n.changeLanguage(lang.toLowerCase());
    localStorage.setItem('lang', lang.toLowerCase());
  };

  return (
    <div className="flex flex-col h-screen w-[240px] bg-teak text-teak-text relative overflow-hidden">
      {/* Header with rhombus motif */}
      <div className="relative h-[120px] px-5 pt-6 overflow-hidden shrink-0">
        <div
          className="absolute inset-0 motif-rhombus text-brand-300"
          aria-hidden="true"
          style={{
            opacity: 0.04,
            maskImage: 'linear-gradient(to bottom, #000 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 30%, transparent 100%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-brand-600 text-white text-[16px] font-semibold tracking-wider">
            U
          </span>
          <div>
            <div className="text-[15.5px] font-semibold text-teak-text leading-none">Uchqun</div>
            <div className="text-[11.5px] text-brand-200 mt-1 leading-none">
              {t('sidebar.subtitle', { defaultValue: 'Qabulxona portali' })}
            </div>
          </div>
        </div>
        <div className="relative mt-5 text-[10.5px] font-mono uppercase tracking-[0.18em] text-teak-muted">
          {user?.schoolName || t('sidebar.school', { defaultValue: 'Maktab' })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        <div className="px-3 mt-1 mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.18em] text-teak-muted">
          {t('nav.menu', { defaultValue: 'Menyu' })}
        </div>

        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`relative flex items-center gap-3 h-10 pl-3 pr-3 rounded-md transition-colors ${
                active
                  ? 'text-teak-text'
                  : 'text-teak-muted hover:text-teak-text hover:bg-teak-hover'
              }`}
              style={active ? { background: 'rgba(200,144,48,0.08)' } : undefined}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand-600" />
              )}
              <item.icon
                className={`w-5 h-5 shrink-0 ${active ? 'text-brand-300' : ''}`}
                strokeWidth={2}
              />
              <span className="text-[13.5px] font-medium">{item.name}</span>
            </Link>
          );
        })}

        <div className="px-3 mt-5 mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.18em] text-teak-muted">
          {t('nav.system', { defaultValue: 'Tizim' })}
        </div>

        {secondaryNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`relative flex items-center gap-3 h-10 pl-3 pr-3 rounded-md transition-colors ${
                active
                  ? 'text-teak-text'
                  : 'text-teak-muted hover:text-teak-text hover:bg-teak-hover'
              }`}
              style={active ? { background: 'rgba(200,144,48,0.08)' } : undefined}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand-600" />
              )}
              <item.icon
                className={`w-5 h-5 shrink-0 ${active ? 'text-brand-300' : ''}`}
                strokeWidth={2}
              />
              <span className="text-[13.5px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User card pinned bottom */}
      <div
        className="mx-3 mb-3 rounded-lg border border-teak-divider p-3 shrink-0"
        style={{ background: 'rgba(56,75,77,0.6)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white inline-flex items-center justify-center text-[12px] font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-teak-text truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-[11px] text-teak-muted truncate">
              {t('role.reception', { defaultValue: 'Qabulxona xodimi' })}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded text-teak-muted hover:text-teak-text hover:bg-teak transition-colors"
            title={t('nav.logout', { defaultValue: 'Chiqish' })}
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Language switcher */}
        <div
          className="mt-2.5 inline-flex items-center p-0.5 rounded-full w-full justify-around text-[11px]"
          style={{ background: 'rgba(42,59,61,0.8)' }}
        >
          {langs.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLang(lang)}
              className={`px-2 h-5 rounded-full font-medium transition-colors ${
                currentLang === lang
                  ? 'bg-brand-600 text-white'
                  : 'text-teak-muted hover:text-teak-text'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
