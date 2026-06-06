import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, MessageCircle, User, Bell, Settings, UtensilsCrossed, Image, HelpCircle, Heart, CalendarCheck } from 'lucide-react';
import ChildSwitcher from './ChildSwitcher';
import { useNotification } from '../context/NotificationContext';

const NAV_LINKS = [
  { label: 'Bugun',    href: '/',           icon: Home          },
  { label: 'Kundalik', href: '/activities', icon: BookOpen      },
  { label: 'Davomat',  href: '/attendance', icon: CalendarCheck },
  { label: 'Taomlar',  href: '/meals',      icon: UtensilsCrossed },
  { label: 'Galereya', href: '/media',      icon: Image         },
  { label: 'Terapiya', href: '/therapy',    icon: Heart         },
  { label: 'Xabarlar', href: '/chat',       icon: MessageCircle },
  { label: 'Yordam',   href: '/help',       icon: HelpCircle    },
  { label: 'Profil',   href: '/child',      icon: User          },
];

const DesktopTopNav = () => {
  const location = useLocation();
  const { count = 0 } = useNotification();

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 bg-p-paper/90 backdrop-blur border-b border-p-sepia-200">
      <div className="max-w-5xl mx-auto px-6 h-[60px] flex items-center gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-md bg-p-brand-800 text-p-brand-200 grid place-items-center font-semibold text-[13px]">
            U
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-p-ink">Uchqun</span>
          <span className="text-[12px] text-p-sepia-500 ml-0.5">· Ota-ona</span>
        </div>

        <nav className="flex items-center gap-1 text-[13px] ml-2">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors font-medium ${
                  active
                    ? 'bg-p-brand-50 text-p-brand-700'
                    : 'text-p-sepia-600 hover:bg-p-sepia-100 hover:text-p-ink'
                }`}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/notifications"
            className="relative p-2 rounded-md text-p-sepia-500 hover:bg-p-sepia-100 hover:text-p-ink transition-colors"
            aria-label="Bildirishnomalar"
          >
            <Bell className="w-4 h-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-p-brand-600 text-white text-[9px] leading-none font-bold rounded-full px-1 py-0.5 border border-p-paper">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          <Link
            to="/settings"
            className="p-2 rounded-md text-p-sepia-500 hover:bg-p-sepia-100 hover:text-p-ink transition-colors"
            aria-label="Sozlamalar"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <ChildSwitcher compact />
        </div>
      </div>
    </header>
  );
};

export default DesktopTopNav;
