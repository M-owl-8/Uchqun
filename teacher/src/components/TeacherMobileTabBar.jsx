// TP-IA-REDESIGN — 5-tab bottom navigation for teacher portal.
// Same structural pattern as parent's MobileTabBar. Order matches DesktopTopNav.

import { Link, useLocation } from 'react-router-dom';
import { Home, Users, ClipboardList, MessageCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TeacherMobileTabBar = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const TABS = [
    { key: 'bugun',   labelKey: 'teacherNav.bugun',   href: '/teacher',          icon: Home          },
    { key: 'bolalar', labelKey: 'teacherNav.bolalar', href: '/teacher/bolalar',  icon: Users         },
    { key: 'reja',    labelKey: 'teacherNav.reja',    href: '/teacher/reja',     icon: ClipboardList },
    { key: 'xabar',   labelKey: 'teacherNav.xabar',   href: '/teacher/xabar',    icon: MessageCircle },
    { key: 'men',     labelKey: 'teacherNav.men',     href: '/teacher/men',      icon: User          },
  ];

  const isActive = (href) =>
    href === '/teacher' ? location.pathname === '/teacher' : location.pathname.startsWith(href);

  return (
    <div className="bg-surface border-t border-slate-200 tabbar-shadow">
      <nav className="flex justify-around items-center h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.key}
              to={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                active ? 'text-brand-600' : 'text-slate-400'
              }`}
            >
              <tab.icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
              <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default TeacherMobileTabBar;
