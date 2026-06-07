// TP-IA-REDESIGN — desktop top nav for teacher portal.
// Same 5 primary tabs as mobile bottom bar + Settings on the right.
// Brand left, primary nav middle, bell + quick-observation FAB + ChildSwitcher-ish right.

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Home, Users, ClipboardList, MessageCircle, User, Bell, Plus, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../shared/context/SocketContext';
import api from '../shared/services/api';
import QuickObservation from './QuickObservation';

const TeacherTopNav = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { on, off } = useSocket();
  const [warningsCount, setWarningsCount] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const fetch = async () => {
      try {
        const res = await api.get('/ai-warnings', { params: { resolved: false, limit: 1 } });
        if (alive) setWarningsCount(res.data?.data?.total ?? 0);
      } catch { /* badge stays */ }
    };
    fetch();
    on('warning:created', fetch);
    on('warning:resolved', fetch);
    return () => {
      alive = false;
      off('warning:created', fetch);
      off('warning:resolved', fetch);
    };
  }, [on, off]);

  const PRIMARY = [
    { labelKey: 'teacherNav.bugun',   href: '/teacher',         icon: Home          },
    { labelKey: 'teacherNav.bolalar', href: '/teacher/bolalar', icon: Users         },
    { labelKey: 'teacherNav.reja',    href: '/teacher/reja',    icon: ClipboardList },
    { labelKey: 'teacherNav.xabar',   href: '/teacher/xabar',   icon: MessageCircle },
    { labelKey: 'teacherNav.men',     href: '/teacher/men',     icon: User          },
  ];

  const isActive = (href) =>
    href === '/teacher' ? location.pathname === '/teacher' : location.pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-md bg-brand-800 text-brand-200 grid place-items-center font-semibold text-[13px]">
              U
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-slate-900">
              {t('brand.appName', { defaultValue: 'Uchqun' })}
            </span>
            <span className="text-[12px] text-slate-500 ml-0.5">
              · {t('brand.roleTeacher', { defaultValue: 'Tarbiyachi' })}
            </span>
          </div>

          <nav className="flex items-center gap-1 text-[13px] ml-2">
            {PRIMARY.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors font-medium ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {t(link.labelKey)}
                </Link>
              );
            })}
            <span className="w-px h-5 bg-slate-200 mx-1" />
            <Link
              to="/teacher/men?tab=settings"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors font-medium ${
                location.pathname.startsWith('/teacher/men') && location.search.includes('settings')
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              {t('teacherNav.settings', { defaultValue: 'Sozlamalar' })}
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFabOpen(true)}
              aria-label={t('layout.newObservation', { defaultValue: 'Yangi kuzatish' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors text-[13px] font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t('layout.newObservation', { defaultValue: 'Kuzatish' })}</span>
            </button>
            <Link
              to="/teacher/xabar?tab=warnings"
              className="relative p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label={t('layout.notifications', { defaultValue: 'Bildirishnomalar' })}
            >
              <Bell className="w-4 h-4" />
              {warningsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-[9px] leading-none font-bold rounded-full px-1 py-0.5 border border-surface">
                  {warningsCount > 9 ? '9+' : warningsCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
      {fabOpen && <QuickObservation onClose={() => setFabOpen(false)} />}
    </>
  );
};

export default TeacherTopNav;
