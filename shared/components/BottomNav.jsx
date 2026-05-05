import { Link, useLocation } from 'react-router-dom';
import { Calendar, HelpCircle, Home, Image as ImageIcon, User } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Activities', href: '/activities', icon: Calendar },
  { name: 'Media', href: '/media', icon: ImageIcon },
  { name: 'Profile', href: '/child', icon: User },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

const BottomNav = () => {
  const location = useLocation();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg">
      <nav aria-label="Main navigation" className="flex justify-around items-center h-16">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              aria-label={item.name}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                active ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" aria-hidden="true" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
