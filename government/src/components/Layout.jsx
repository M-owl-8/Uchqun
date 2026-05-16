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
    <div className="min-h-screen relative overflow-hidden bg-paper">
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
        <Sidebar />
      </div>

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
        <span className="font-semibold text-white text-sm">{t('sidebar.title', { defaultValue: 'Davlat Panel' })}</span>
      </div>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

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

      <div className="lg:pl-64 relative z-10 pt-14 lg:pt-0">
        <main key={location.pathname} className="page-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
