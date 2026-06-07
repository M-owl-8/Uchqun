// TP-IA-REDESIGN — sticky mobile header for teacher portal.
// Brand mark left, notification bell right (badge = unresolved warnings + system).
// Pairs with TeacherMobileTabBar (5 tabs at the bottom).

import { Link } from 'react-router-dom';
import { Bell, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../shared/context/SocketContext';
import api from '../shared/services/api';
import QuickObservation from './QuickObservation';

const TeacherMobileTopBar = () => {
  const { t } = useTranslation();
  const { on, off } = useSocket();
  const [warningsCount, setWarningsCount] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);

  // Notification badge counts unresolved AI warnings — the teacher's most
  // attention-driving signal. Chat unread lives on the Xabar tab badge.
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

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-md bg-brand-800 text-brand-200 grid place-items-center font-semibold text-[13px]">
              U
            </span>
            <div className="leading-tight">
              <span className="block text-[13px] font-semibold tracking-tight text-slate-900">
                {t('brand.appName', { defaultValue: 'Uchqun' })}
              </span>
              <span className="block text-[10px] text-slate-500">
                {t('brand.roleTeacher', { defaultValue: 'Tarbiyachi' })}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFabOpen(true)}
              aria-label={t('layout.newObservation', { defaultValue: 'Yangi kuzatish' })}
              className="w-9 h-9 inline-flex items-center justify-center rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
            </button>
            <Link
              to="/teacher/xabar?tab=warnings"
              aria-label={t('layout.notifications', { defaultValue: 'Bildirishnomalar' })}
              className="relative p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {warningsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-[10px] leading-none font-bold rounded-full px-1.5 py-0.5 border-2 border-surface">
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

export default TeacherMobileTopBar;
