import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserRound,
  FileCheck2,
  BellRing,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  Brain,
  UsersRound,
  Upload,
  Building2,
  MessageSquare,
  Mail,
  ClipboardList,
  Globe,
  ChevronDown,
} from 'lucide-react';

// 14 items in 4 sections (down from 18 in 4 sections)
// Removed from primary nav: profile (user card), activity (dashboard link), trash (settings)
// Documents promoted into Boshqaruv; new Aloqa section for comms
const NAV_SECTIONS = [
  {
    labelKey: 'nav.section.management',
    items: [
      { key: 'nav.dashboard',      href: '/admin',                icon: LayoutDashboard },
      { key: 'nav.receptions',     href: '/admin/receptions',     icon: Users },
      { key: 'nav.teachers',       href: '/admin/teachers',       icon: GraduationCap },
      { key: 'nav.groups',         href: '/admin/groups',         icon: UsersRound },
      { key: 'nav.parents',        href: '/admin/parents',        icon: UserRound },
      { key: 'nav.documents',      href: '/admin/documents',      icon: FileCheck2 },
    ],
  },
  {
    labelKey: 'nav.section.communications',
    items: [
      { key: 'nav.communications', href: '/admin/communications', icon: MessageSquare },
      { key: 'nav.govMessages',    href: '/admin/messages',       icon: Mail },
    ],
  },
  {
    labelKey: 'nav.section.reports',
    items: [
      { key: 'nav.aiWarnings',     href: '/admin/ai-warnings',    icon: BellRing },
      { key: 'nav.schoolRatings',  href: '/admin/school-ratings', icon: BarChart3 },
      { key: 'nav.therapy',        href: '/admin/therapy',        icon: Brain },
      { key: 'nav.irr',            href: '/admin/irr',            icon: ClipboardList },
    ],
  },
  {
    labelKey: 'nav.section.settings',
    items: [
      { key: 'nav.school',         href: '/admin/school',         icon: Building2 },
      { key: 'nav.import',         href: '/admin/import',         icon: Upload },
      { key: 'nav.settings',       href: '/admin/settings',       icon: Settings },
    ],
  },
];

const LANG_LABELS = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };

const LangDropdown = ({ currentLang, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium text-walnut-muted hover:text-white hover:bg-walnut-hover transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 text-left">{LANG_LABELS[currentLang] || currentLang.toUpperCase()}</span>
        <ChevronDown
          className="w-3 h-3 shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 right-0 mb-1 rounded-md bg-walnut-hover border border-walnut-divider py-0.5 z-10"
        >
          {['uz', 'ru', 'en'].map((lng) => (
            <button
              key={lng}
              type="button"
              role="option"
              aria-selected={currentLang === lng}
              onClick={() => { onChange(lng); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[11.5px] transition-colors ${
                currentLang === lng
                  ? 'text-white font-semibold bg-brand-600/20'
                  : 'text-walnut-muted hover:text-white'
              }`}
            >
              {LANG_LABELS[lng]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

  const currentLang = i18n.language?.split('-')[0] || 'uz';

  const handleChangeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('dnp:lang', lng);
  };

  return (
    <div className="flex flex-col h-full bg-walnut text-walnut-text">
      {/* Header */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-brand-600 text-[#F2E9DF] font-bold text-base"
            style={{ letterSpacing: '-0.06em' }}
          >
            U
          </span>
          <p className="text-base font-semibold tracking-tight">Uchqun</p>
        </div>

        {/* Institution slot */}
        <div className="mt-4 flex items-center gap-3 p-2.5 bg-walnut-hover rounded-md border border-walnut-divider">
          <div className="w-10 h-10 rounded-md bg-walnut text-brand-400 flex items-center justify-center shrink-0 border border-walnut-divider">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.school?.name ?? t('sidebar.school', { defaultValue: 'Muassasa' })}</p>
            <p className="text-[11px] text-walnut-muted truncate">{user?.school?.city ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-walnut-muted mb-1.5">
              {t(section.labelKey, { defaultValue: section.labelKey })}
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

      {/* Language dropdown + User card */}
      <div className="m-3 mt-1 space-y-1">
        {/* Language dropdown */}
        <div className="px-0.5">
          <LangDropdown currentLang={currentLang} onChange={handleChangeLang} />
        </div>

        {/* User card */}
        <div className="p-3 bg-walnut-hover rounded-md border border-walnut-divider">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-sm font-semibold shrink-0">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-walnut-muted truncate">{t('role.admin', { defaultValue: 'Direktor' })}</p>
            </div>
            <button
              aria-label={t('logout', { defaultValue: 'Chiqish' })}
              onClick={logout}
              className="text-walnut-muted hover:text-white p-1.5 rounded hover:bg-walnut transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
