import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, MessageCircle, User } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const TABS = [
  { key: 'home',     label: 'Bugun',    href: '/',             icon: Home          },
  { key: 'journal',  label: 'Kundalik', href: '/activities',   icon: BookOpen      },
  { key: 'messages', label: 'Xabarlar', href: '/chat',         icon: MessageCircle },
  { key: 'profile',  label: 'Profil',   href: '/child',        icon: User          },
];

const MobileTabBar = () => {
  const location = useLocation();
  const { count = 0 } = useNotification();

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <div className="bg-p-surface border-t border-p-sepia-200 tabbar-shadow">
      <nav className="flex justify-around items-center h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const showBadge = tab.key === 'messages' && count > 0;
          return (
            <Link
              key={tab.key}
              to={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                active ? 'text-p-brand-600' : 'text-p-sepia-400'
              }`}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
                {showBadge && (
                  <span className="absolute -top-2 -right-2 bg-p-honey-500 text-white text-[10px] leading-none font-bold rounded-full px-1.5 py-0.5 border-2 border-p-surface">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileTabBar;
