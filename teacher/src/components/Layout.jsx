import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bell, Menu, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import QuickObservation from './QuickObservation';

const PAGE_NAME_KEYS = {
  '/teacher':            'layout.pageToday',
  '/teacher/attendance': 'layout.pageAttendance',
  '/teacher/parents':    'layout.pageParents',
  '/teacher/media':      'layout.pageGallery',
  '/teacher/monitoring': 'layout.pageGoals',
  '/teacher/activities': 'layout.pageObservations',
  '/teacher/chat':       'layout.pageChat',
  '/teacher/reflection': 'layout.pageReflection',
  '/teacher/journal':    'layout.pageJournal',
  '/teacher/profile':    'layout.pageProfile',
  '/teacher/settings':   'layout.pageSettings',
  '/teacher/meals':      'layout.pageMeals',
  '/teacher/therapy':    'layout.pageTherapy',
  '/teacher/warnings':   'layout.pageWarnings',
};

const getPageNameKey = (pathname) => {
  if (PAGE_NAME_KEYS[pathname]) return PAGE_NAME_KEYS[pathname];
  if (pathname.startsWith('/teacher/children/')) return 'layout.pageChildProfile';
  return 'layout.pageDefault';
};

const Layout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const pageName = t(getPageNameKey(location.pathname));

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
            aria-label={t('layout.menuOpen')}
          >
            <Menu className="w-5 h-5 text-slate-700" strokeWidth={1.75} />
          </button>

          <span className="text-[15px] font-semibold text-slate-900">{pageName}</span>

          <div className="ml-auto flex items-center gap-2">
            {/* Quick observation FAB — mobile only (replaces removed bottom nav) */}
            <button
              className="md:hidden w-8 h-8 grid place-items-center rounded-md bg-brand-600 text-surface hover:bg-brand-700 transition-colors"
              onClick={() => setFabOpen(true)}
              aria-label={t('layout.newObservation')}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              className="w-8 h-8 grid place-items-center rounded-md border border-slate-200 bg-surface relative hover:bg-slate-50 transition-colors"
              aria-label={t('layout.notifications')}
            >
              <Bell className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          key={location.pathname}
          className="page-fade flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 pb-8"
        >
          <Outlet />
        </main>
      </div>

      {fabOpen && <QuickObservation onClose={() => setFabOpen(false)} />}
    </div>
  );
};

export default Layout;
