import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UsersRound,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.dashboard'), href: '/reception', icon: LayoutDashboard },
    { name: t('nav.parents'), href: '/reception/parents', icon: Users },
    { name: t('nav.teachers'), href: '/reception/teachers', icon: UserCheck },
    { name: t('nav.groups'), href: '/reception/groups', icon: UsersRound },
    { name: t('nav.profile', { defaultValue: 'Profil' }), href: '/reception/profile', icon: User },
  ];

  const isActive = (path) => {
    if (path === '/reception') return location.pathname === '/reception';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bg-surface border-t border-slate-200 shadow-lg">
      <nav className="flex justify-around items-center h-16">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? 'text-brand-600' : 'text-slate-500'
              }`}
            >
              <item.icon
                className={`w-5 h-5 mb-1 ${active ? 'text-brand-600' : 'text-slate-500'}`}
                strokeWidth={active ? 2 : 1.5}
              />
              <span className={`text-xs font-medium ${active ? 'text-brand-600' : 'text-slate-500'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
