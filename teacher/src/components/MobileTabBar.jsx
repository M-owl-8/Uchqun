import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Home, Users, Plus, MessageSquare, User } from 'lucide-react';
import { useSocket } from '../shared/context/SocketContext';
import QuickObservation from './QuickObservation';

const TABS = [
  { href: '/teacher',         icon: Home,         label: 'Bugun',    key: 'home' },
  { href: '/teacher/parents', icon: Users,        label: 'Bolalar',  key: 'children' },
  { key: 'fab' }, // center FAB placeholder
  { href: '/teacher/chat',    icon: MessageSquare, label: 'Xabarlar', key: 'chat', badgeKey: 'chat' },
  { href: '/teacher/profile', icon: User,          label: 'Profil',   key: 'profile' },
];

const MobileTabBar = () => {
  const location = useLocation();
  const [fabOpen, setFabOpen] = useState(false);

  const isActive = (href) => {
    if (!href) return false;
    if (href === '/teacher') return location.pathname === '/teacher';
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-slate-200 flex items-center justify-around px-2" style={{ height: 56 }}>
        {TABS.map((tab) => {
          if (tab.key === 'fab') {
            return (
              <button
                key="fab"
                onClick={() => setFabOpen(true)}
                className="relative -mt-7 flex-shrink-0"
                aria-label="Yangi yozuv"
              >
                <span className="w-14 h-14 rounded-full bg-brand-600 grid place-items-center text-surface shadow-md ring-4 ring-surface">
                  <Plus className="w-6 h-6" strokeWidth={2} />
                </span>
              </button>
            );
          }

          const active = isActive(tab.href);

          return (
            <Link
              key={tab.key}
              to={tab.href}
              className="flex flex-col items-center gap-0.5 relative px-2 py-1"
            >
              <tab.icon
                className="w-[22px] h-[22px]"
                strokeWidth={1.75}
                style={{ color: active ? '#7A6FA8' : '#6F7585' }}
              />
              {active && (
                <span className="text-[10px] font-medium text-brand-700">
                  {tab.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Quick observation modal/sheet */}
      {fabOpen && <QuickObservation onClose={() => setFabOpen(false)} />}
    </>
  );
};

export default MobileTabBar;
