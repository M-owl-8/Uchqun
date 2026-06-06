import { Link, useLocation } from 'react-router-dom';
import { Home, NotebookPen, Image as ImageIcon, MessageCircle, User, Star, Settings, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ChildSwitcher from './ChildSwitcher';
import { useNotification } from '../context/NotificationContext';

const DesktopTopNav = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { count = 0 } = useNotification();

  // Primary tabs — same five as MobileTabBar, in the same order.
  // Secondary (Rating, Settings) sit to the right; aux icons (Bell + ChildSwitcher) far right.
  const PRIMARY = [
    { labelKey: 'nav.today',    href: '/',         icon: Home          },
    { labelKey: 'nav.diary',    href: '/journal',  icon: NotebookPen   },
    { labelKey: 'nav.gallery',  href: '/media',    icon: ImageIcon     },
    { labelKey: 'nav.messages', href: '/chat',     icon: MessageCircle },
    { labelKey: 'nav.child',    href: '/child',    icon: User          },
  ];
  const SECONDARY = [
    { labelKey: 'nav.rating',   href: '/rating',   icon: Star          },
    { labelKey: 'nav.settings', href: '/settings', icon: Settings      },
  ];

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const renderLink = (link) => {
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
        {t(link.labelKey)}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-p-paper/90 backdrop-blur border-b border-p-sepia-200">
      <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-md bg-p-brand-800 text-p-brand-200 grid place-items-center font-semibold text-[13px]">
            U
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-p-ink">
            {t('brand.appName')}
          </span>
          <span className="text-[12px] text-p-sepia-500 ml-0.5">
            · {t('brand.role')}
          </span>
        </div>

        <nav className="flex items-center gap-1 text-[13px] ml-2">
          {PRIMARY.map(renderLink)}
          <span className="w-px h-5 bg-p-sepia-200 mx-1" />
          {SECONDARY.map(renderLink)}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/notifications"
            className="relative p-2 rounded-md text-p-sepia-500 hover:bg-p-sepia-100 hover:text-p-ink transition-colors"
            aria-label={t('nav.notifications')}
          >
            <Bell className="w-4 h-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-p-brand-600 text-white text-[9px] leading-none font-bold rounded-full px-1 py-0.5 border border-p-paper">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          <ChildSwitcher compact />
        </div>
      </div>
    </header>
  );
};

export default DesktopTopNav;
