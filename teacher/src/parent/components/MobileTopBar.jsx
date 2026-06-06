import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';
import ChildSwitcher from './ChildSwitcher';

// Sticky mobile header — brand mark left, child switcher centre, bell right.
// Pairs with the 5-tab MobileTabBar (the bottom nav). Visible only < lg.
const MobileTopBar = () => {
  const { t } = useTranslation();
  const { count = 0 } = useNotification();

  return (
    <header className="sticky top-0 z-40 bg-p-paper/95 backdrop-blur border-b border-p-sepia-200">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-md bg-p-brand-800 text-p-brand-200 grid place-items-center font-semibold text-[13px]">
            U
          </span>
          <div className="leading-tight">
            <span className="block text-[13px] font-semibold tracking-tight text-p-ink">
              {t('brand.appName')}
            </span>
            <span className="block text-[10px] text-p-sepia-500">
              {t('brand.role')}
            </span>
          </div>
        </div>

        <div className="flex-1 flex justify-center overflow-x-auto no-scrollbar">
          <ChildSwitcher compact />
        </div>

        <Link
          to="/notifications"
          aria-label={t('nav.notifications')}
          className="relative p-2 rounded-lg text-p-sepia-500 hover:bg-p-sepia-100 hover:text-p-ink transition-colors shrink-0"
        >
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-p-brand-600 text-white text-[10px] leading-none font-bold rounded-full px-1.5 py-0.5 border-2 border-p-paper">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};

export default MobileTopBar;
