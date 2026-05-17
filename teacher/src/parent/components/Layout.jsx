import { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, MessageCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import JoyfulBackground from '../../shared/components/JoyfulBackground';

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Joyful Background - Sky, Sun, Clouds, Hills */}
      <JoyfulBackground />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-surface shadow-lg z-40">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-surface shadow-lg z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Hamburger button — mobile only */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface shadow-md text-slate-700 hover:bg-slate-50"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main Content */}
      <div className="lg:pl-64 pt-16 lg:pt-8 pb-24 lg:pb-6 relative z-10">
        <main key={location.pathname} className="page-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation - Only visible on mobile (small screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>

      {/* Floating chat button (hide on chat page) */}
      {location.pathname !== '/chat' && (
        <div className="lg:hidden fixed bottom-20 right-4 z-50">
          <Link
            to="/chat"
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 transition"
            aria-label="Chat"
          >
            <MessageCircle className="w-6 h-6" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default Layout;
