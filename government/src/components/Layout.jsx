import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import GovernmentBackground from './GovernmentBackground';

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Government Background - Professional theme */}
      <GovernmentBackground />
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-40">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-40 flex items-center px-4 gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Open menu"
          aria-expanded={sidebarOpen}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
        <span className="font-semibold text-gray-800">Uchqun Government</span>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-modal="true"
        role="dialog"
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 relative z-10 pt-14 lg:pt-0">
        <main key={location.pathname} className="page-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
