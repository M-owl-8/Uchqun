import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Image as ImageIcon,
  Target,
  ClipboardList,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  UtensilsCrossed,
  Stethoscope,
  ShieldAlert,
  UserCircle2,
} from 'lucide-react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { useTranslation } from 'react-i18next';
import api from '../shared/services/api';
import { LanguageSwitcher } from '../../../shared/components/LanguageSwitcher';

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { on, off } = useSocket();
  const { i18n, t } = useTranslation();

  const navSections = [
    {
      label: t('sidebar.section.today', { defaultValue: 'Bugun' }),
      items: [
        { key: 'dashboard',  href: '/teacher',            icon: LayoutDashboard, label: t('sidebar.dashboard',  { defaultValue: 'Bosh sahifa' }) },
        { key: 'attendance', href: '/teacher/attendance',  icon: CalendarCheck,   label: t('sidebar.attendance', { defaultValue: 'Davomat' }) },
      ],
    },
    {
      label: t('sidebar.section.children', { defaultValue: 'Bolalar' }),
      items: [
        { key: 'parents', href: '/teacher/parents', icon: Users,           label: t('sidebar.childrenList', { defaultValue: "Guruh ro'yxati" }) },
        { key: 'media',   href: '/teacher/media',   icon: ImageIcon,       label: t('sidebar.gallery',      { defaultValue: 'Galereya' }) },
        { key: 'meals',   href: '/teacher/meals',   icon: UtensilsCrossed, label: t('sidebar.meals',        { defaultValue: 'Ovqatlanish' }) },
      ],
    },
    {
      label: t('sidebar.section.iep', { defaultValue: 'IEP' }),
      items: [
        { key: 'monitoring',  href: '/teacher/monitoring',  icon: Target,        label: t('sidebar.goals',       { defaultValue: 'Maqsadlar' }) },
        { key: 'activities',  href: '/teacher/activities',  icon: ClipboardList, label: t('sidebar.observations', { defaultValue: 'Kuzatuvlar' }) },
        { key: 'therapy',     href: '/teacher/therapy',     icon: Stethoscope,   label: t('sidebar.therapy',     { defaultValue: 'Terapiya' }) },
        { key: 'ai-warnings', href: '/teacher/ai-warnings', icon: ShieldAlert,   label: t('sidebar.aiWarnings',  { defaultValue: 'Ogohlantirishlar' }) },
      ],
    },
    {
      label: t('sidebar.section.communication', { defaultValue: 'Aloqa' }),
      items: [
        { key: 'chat',       href: '/teacher/chat',       icon: MessageSquare, label: t('sidebar.chat',       { defaultValue: 'Ota-onalar' }), badgeKey: 'chat' },
        { key: 'reflection', href: '/teacher/reflection', icon: FileText,      label: t('sidebar.reflection', { defaultValue: 'Kun jurnali' }) },
      ],
    },
  ];
  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    let alive = true;

    const fetchCount = async () => {
      if (!alive) return;
      try {
        const res = await api.get('/chat/unread-count', { params: { prefix: 'parent:', role: 'teacher' } });
        if (alive) setUnreadChat(res.data.count ?? 0);
      } catch {
        // Non-critical — badge stays at last known value
      }
    };

    fetchCount();
    on('chat:message', fetchCount);
    return () => {
      alive = false;
      off('chat:message', fetchCount);
    };
  }, [on, off]);

  const isActive = (href) => {
    if (href === '/teacher') return location.pathname === '/teacher';
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };


  const initials =
    `${(user?.firstName || '').charAt(0)}${(user?.lastName || '').charAt(0)}`.toUpperCase();

  const schoolInfo = user?.schoolName || user?.school || null;

  return (
    <div
      className="flex flex-col h-screen"
      style={{ width: 240, background: '#2A2530', color: '#F4F0F5' }}
    >
      {/* Brand block */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #48404F' }}>
        <div className="flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-md grid place-items-center font-semibold text-[14px]"
            style={{ background: '#48404F', color: '#D8CFE5' }}
          >
            U
          </span>
          <div>
            <div className="text-[14px] font-semibold leading-none">Uchqun</div>
            <div className="text-[11px] mt-0.5" style={{ color: '#928A9C' }}>
              O&apos;qituvchi portali
            </div>
          </div>
        </div>
        {schoolInfo && (
          <div
            className="mt-3 text-[11px] font-mono uppercase tracking-wide truncate"
            style={{ color: '#928A9C' }}
          >
            {schoolInfo}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="px-2 py-3 flex-1 overflow-y-auto text-[13px]">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            <div
              className="px-3 pb-1.5 pt-3 text-[10px] uppercase tracking-[.14em]"
              style={{ color: '#928A9C' }}
            >
              {section.label}
            </div>

            {section.items.map((item) => {
              const active = isActive(item.href);
              const badge = item.badgeKey === 'chat' ? unreadChat : 0;

              return (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={onClose}
                  className="relative flex items-center gap-2.5 px-3 py-2 rounded-md mt-0.5 transition-colors"
                  style={{
                    background: active ? 'rgba(122,111,168,.18)' : 'transparent',
                    color: '#F4F0F5',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#3A3340'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(122,111,168,.18)' : 'transparent'; }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                      style={{ background: '#7A6FA8' }}
                    />
                  )}

                  <item.icon
                    className="w-[18px] h-[18px] shrink-0"
                    strokeWidth={1.75}
                    style={{ color: active ? '#D8CFE5' : '#928A9C' }}
                  />

                  <span className={active ? 'font-medium' : ''}>
                    {item.label}
                  </span>

                  {badge > 0 && (
                    <span
                      className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: '#9A5045', color: '#fff' }}
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Account links */}
        <div className="mt-2">
          <Link
            to="/teacher/profile"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors"
            style={{ color: '#F4F0F5' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#3A3340'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <UserCircle2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} style={{ color: '#928A9C' }} />
            <span>Profil</span>
          </Link>
          <Link
            to="/teacher/settings"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors"
            style={{ color: '#F4F0F5' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#3A3340'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} style={{ color: '#928A9C' }} />
            <span>Sozlamalar</span>
          </Link>
        </div>
      </nav>

      {/* User card */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid #48404F' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full grid place-items-center text-[12px] font-semibold shrink-0"
            style={{ background: '#7A6FA8', color: '#fff' }}
          >
            {initials || 'O'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate" style={{ color: '#F4F0F5' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-[10px]" style={{ color: '#928A9C' }}>O&apos;qituvchi</div>
          </div>
          <button
            onClick={logout}
            className="w-7 h-7 grid place-items-center rounded-md transition-colors"
            style={{ color: '#928A9C' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#3A3340'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="Chiqish"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Language switcher */}
        <div className="mt-2.5">
          <LanguageSwitcher variant="sidebar" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
