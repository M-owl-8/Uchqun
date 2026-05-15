import { Link, useLocation } from 'react-router-dom';
import { Home, User, Star, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.home', { defaultValue: 'Home' }), href: '/', icon: Home },
    { name: t('nav.profile'), href: '/child', icon: User },
    { name: t('nav.rating'), href: '/rating', icon: Star },
    { name: t('nav.aiChat'), href: '/ai-chat', icon: Bot },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg">
      <nav className="flex justify-around items-center h-16">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <item.icon className={`w-5 h-5 mb-1 ${active ? 'text-primary-600' : 'text-gray-500'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-[10px] leading-none font-extrabold rounded-full px-1.5 py-1 border-2 border-white shadow-sm">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium max-w-[72px] truncate ${active ? 'text-primary-600' : 'text-gray-500'}`}>
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
