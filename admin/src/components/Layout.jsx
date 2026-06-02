import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] z-40">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-[260px] z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-40 p-2 text-warm-700 bg-surface border border-warm-200 rounded-md shadow-xs hover:bg-warm-50"
        onClick={() => setSidebarOpen(true)}
        aria-label="Menyu"
      >
        <Menu className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {/* Main content */}
      <div className="lg:pl-[260px] flex-1 min-w-0">
        <main key={location.pathname} className="px-6 lg:px-10 py-9 pt-16 lg:pt-9 max-w-screen-xl">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <BottomNav />
      </div>
    </div>
  );
};

export default Layout;
