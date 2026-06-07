// TP-IA-REDESIGN — Xabar tab.
//
// Two sub-tabs:
//   - Suhbat            → existing Chat.jsx (parent ↔ teacher messages)
//   - Ogohlantirishlar  → existing AIWarnings (parent portal component, shared)
//
// Badge on Suhbat = unread chat count.
// Badge on Ogohlantirishlar = unresolved AI warnings count.

import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, ShieldAlert } from 'lucide-react';
import Chat from './Chat';
import AIWarnings from '../parent/pages/AIWarnings';
import api from '../shared/services/api';
import { useSocket } from '../shared/context/SocketContext';

const Xabar = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeKey = searchParams.get('tab') || 'chat';
  const { on, off } = useSocket();
  const [unreadChat, setUnreadChat] = useState(0);
  const [openWarnings, setOpenWarnings] = useState(0);

  useEffect(() => {
    let alive = true;
    const fetchCounts = async () => {
      try {
        const [chatRes, warnRes] = await Promise.all([
          api.get('/chat/unread-count', { params: { prefix: 'parent:', role: 'teacher' } }).catch(() => ({ data: { count: 0 } })),
          api.get('/ai-warnings', { params: { resolved: false, limit: 1 } }).catch(() => ({ data: { data: { total: 0 } } })),
        ]);
        if (!alive) return;
        setUnreadChat(chatRes.data?.count ?? 0);
        setOpenWarnings(warnRes.data?.data?.total ?? 0);
      } catch { /* badge stays */ }
    };
    fetchCounts();
    on('chat:message', fetchCounts);
    on('warning:created', fetchCounts);
    on('warning:resolved', fetchCounts);
    return () => {
      alive = false;
      off('chat:message', fetchCounts);
      off('warning:created', fetchCounts);
      off('warning:resolved', fetchCounts);
    };
  }, [on, off]);

  const TABS = [
    { key: 'chat',     labelKey: 'xabar.tabChat',     icon: MessageSquare, badge: unreadChat,   Component: Chat },
    { key: 'warnings', labelKey: 'xabar.tabWarnings', icon: ShieldAlert,   badge: openWarnings, Component: AIWarnings },
  ];

  const active = TABS.find(t => t.key === activeKey) || TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-slate-200 -mb-px overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSearchParams({ tab: tab.key })}
              className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(tab.labelKey)}
              {tab.badge > 0 && (
                <span className="bg-brand-600 text-white text-[10px] leading-none font-bold rounded-full px-1.5 py-0.5">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default Xabar;
