// TP-IA-REDESIGN — Men (Me) tab.
//
// The teacher's account hub. Three sub-tabs:
//   - Profil           → existing Profile.jsx
//   - Sozlamalar       → existing Settings.jsx
//   - Kunlik mulohaza  → existing DailyReflection.jsx (private teacher journal)
//
// Plus a logout entry in the Hisob section.

import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircle2, Settings as SettingsIcon, FileText } from 'lucide-react';
import Profile from './Profile';
import Settings from './Settings';
import DailyReflection from './DailyReflection';
import { useAuth } from '../shared/context/AuthContext';
import LogoutButton from '@shared/components/LogoutButton';

const SUB_TABS = [
  { key: 'profile',    labelKey: 'men.tabProfile',    icon: UserCircle2, Component: Profile },
  { key: 'settings',   labelKey: 'men.tabSettings',   icon: SettingsIcon, Component: Settings },
  { key: 'reflection', labelKey: 'men.tabReflection', icon: FileText,    Component: DailyReflection },
];

const Men = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeKey = searchParams.get('tab') || 'profile';
  const active = SUB_TABS.find(t => t.key === activeKey) || SUB_TABS[0];
  const ActiveComponent = active.Component;

  const initials = `${(user?.firstName || '').charAt(0)}${(user?.lastName || '').charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-4">
      {/* Identity strip */}
      <div className="flex items-center gap-3 pb-2">
        <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-[15px] font-semibold">
          {initials || 'O'}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-slate-900 truncate">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="text-[12px] text-slate-500 truncate">
            {t('sidebar.roleTeacher', { defaultValue: 'Tarbiyachi' })}
            {user?.schoolName ? ` · ${user.schoolName}` : ''}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 -mb-px overflow-x-auto">
        {SUB_TABS.map((tab) => {
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
            </button>
          );
        })}
      </div>

      <div>
        <ActiveComponent />
      </div>

      {/* Logout — visible on every Men sub-tab so it's always one tap */}
      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <LogoutButton onLogout={logout} label={t('nav.exit', { defaultValue: 'Chiqish' })} variant="inline" />
      </div>
    </div>
  );
};

export default Men;
