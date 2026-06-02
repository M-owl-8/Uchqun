import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import CommandPalette from './CommandPalette';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { Search, Bell, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function usePageLabel() {
  const location = useLocation();
  const { t } = useTranslation();
  const map = {
    '/reception': t('nav.dashboard'),
    '/reception/parents': t('nav.parents'),
    '/reception/teachers': t('nav.teachers'),
    '/reception/groups': t('nav.groups'),
    '/reception/documents': t('nav.documents', { defaultValue: 'Mening hujjatlarim' }),
    '/reception/settings': t('nav.settings', { defaultValue: 'Sozlamalar' }),
    '/reception/profile': t('nav.profile', { defaultValue: 'Profil' }),
    '/reception/parents/new': t('wizard.title', { defaultValue: "Yangi ota-ona qo'shish" }),
  };
  return map[location.pathname] || 'Uchqun';
}

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { open: paletteOpen, onOpen: openPalette, onClose: closePalette } = useCommandPalette();
  const pageLabel = usePageLabel();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[240px] z-40">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-[240px] z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="lg:pl-[240px]">
        {/* Top bar */}
        <div className="sticky top-0 z-20 h-14 bg-surface border-b border-slate-200 px-6 flex items-center gap-3">
          <button
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
          </button>

          <span className="text-[13px] text-slate-500 hidden sm:block">{pageLabel}</span>

          <div className="flex-1" />

          <button
            onClick={openPalette}
            className="h-9 px-3 rounded-md border border-slate-200 bg-surface hover:bg-slate-50 inline-flex items-center gap-2 text-[13px] text-slate-500 transition-colors"
          >
            <Search className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">Tezkor qidiruv…</span>
            <span className="kbd ml-1">⌘ K</span>
          </button>

          <button className="relative w-9 h-9 rounded-md hover:bg-slate-100 inline-flex items-center justify-center text-slate-600 transition-colors">
            <Bell className="w-4 h-4" strokeWidth={2} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-600 ring-2 ring-surface" />
          </button>
        </div>

        {/* Page content */}
        <main
          key={location.pathname}
          className="page-fade max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
};

export default Layout;
