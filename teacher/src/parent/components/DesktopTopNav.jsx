import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, MessageCircle, User } from 'lucide-react';
import ChildSwitcher from './ChildSwitcher';

const NAV_LINKS = [
  { label: 'Bugun',    href: '/',           icon: Home          },
  { label: 'Kundalik', href: '/activities', icon: BookOpen      },
  { label: 'Xabarlar', href: '/chat',       icon: MessageCircle },
  { label: 'Profil',   href: '/child',      icon: User          },
];

const DesktopTopNav = () => {
  const location = useLocation();

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

        <div className="ml-auto">
          <ChildSwitcher compact />
        </div>
      </div>
    </header>
  );
};

export default DesktopTopNav;
