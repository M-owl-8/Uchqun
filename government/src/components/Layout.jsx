import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';

const Layout = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Desktop sidebar — flex sibling, never scrolls off */}
      <div className="hidden lg:flex lg:flex-col flex-shrink-0 w-64 z-40">
        <Sidebar />
      </div>

      {/* Mobile top bar — fixed to viewport, above the flex container */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar z-40 flex items-center px-4 gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-sidebar-muted hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Open menu"
          aria-expanded={sidebarOpen}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
        <span className="font-semibold text-white text-sm flex-1">{t('sidebar.title', { defaultValue: 'Davlat Panel' })}</span>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-modal="true"
        role="dialog"
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 p-2 rounded-md text-sidebar-muted hover:bg-sidebar-hover"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content — own scroll context; sidebar never scrolls off */}
      <div className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
        <main key={location.pathname} className="page-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
