import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';

// Page name mapping for top bar
const PAGE_NAMES = {
  '/teacher':            'Bugun',
  '/teacher/attendance': 'Davomat',
  '/teacher/parents':    "Guruh ro'yxati",
  '/teacher/media':      'Galereya',
  '/teacher/monitoring': 'Maqsadlar',
  '/teacher/activities': 'Kuzatuvlar',
  '/teacher/chat':       'Ota-onalar',
  '/teacher/reflection': 'Kun jurnali',
  '/teacher/journal':    'Jurnal',
  '/teacher/profile':    'Profil',
  '/teacher/settings':   'Sozlamalar',
  '/teacher/meals':      'Ovqatlanish',
  '/teacher/therapy':    'Terapiya',
};

const getPageName = (pathname) => {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  if (pathname.startsWith('/teacher/children/')) return 'Bola profili';
  return 'Uchqun';
};

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageName = getPageName(location.pathname);

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop Sidebar — fixed 240px */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-40" style={{ width: 240 }}>
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 240 }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="md:pl-[240px] min-h-screen flex flex-col">
        {/* Top bar — 56px */}
        <header
          className="sticky top-0 z-30 bg-surface border-b border-slate-200 flex items-center gap-3 px-4 md:px-6"
          style={{ height: 56 }}
        >
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden w-8 h-8 -ml-1 grid place-items-center"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menyuni ochish"
          >
            <Menu className="w-5 h-5 text-slate-700" strokeWidth={1.75} />
          </button>

          <span className="text-[15px] font-semibold text-slate-900">{pageName}</span>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="w-8 h-8 grid place-items-center rounded-md border border-slate-200 bg-surface relative hover:bg-slate-50 transition-colors"
              aria-label="Bildirishnomalar"
            >
              <Bell className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          key={location.pathname}
          className="page-fade flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-8"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden">
        <MobileTabBar />
      </div>
    </div>
  );
};

export default Layout;
