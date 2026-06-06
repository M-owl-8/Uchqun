import { Link, useLocation } from 'react-router-dom';
import { Home, NotebookPen, Image as ImageIcon, MessageCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MobileTabBar = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const TABS = [
    { key: 'today',    labelKey: 'nav.today',    href: '/',         icon: Home         },
    { key: 'diary',    labelKey: 'nav.diary',    href: '/journal',  icon: NotebookPen  },
    { key: 'gallery',  labelKey: 'nav.gallery',  href: '/media',    icon: ImageIcon    },
    { key: 'messages', labelKey: 'nav.messages', href: '/chat',     icon: MessageCircle },
    { key: 'child',    labelKey: 'nav.child',    href: '/child',    icon: User         },
  ];

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <div className="bg-p-surface border-t border-p-sepia-200 tabbar-shadow">
      <nav className="flex justify-around items-center h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.key}
              to={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                active ? 'text-p-brand-600' : 'text-p-sepia-400'
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

export default MobileTabBar;
