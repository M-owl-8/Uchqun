import { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, MessageCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from '../shared/components/BottomNav';

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-teacher-surface">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
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
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Hamburger button — mobile only */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md text-gray-700 hover:bg-gray-50"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main Content */}
      <div className="lg:pl-64 min-h-screen">
        <main key={location.pathname} className="page-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <BottomNav
          allowed={['/teacher', '/teacher/profile']}
          showExit={false}
        />
      </div>

      {/* Floating chat button for mobile */}
      {location.pathname !== '/teacher/chat' && (
        <div className="lg:hidden fixed bottom-20 right-4 z-40">
          <Link
            to="/teacher/chat"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-500 text-white shadow-lg shadow-teal-200 hover:bg-teal-600 transition"
            aria-label="Chat"
          >
            <MessageCircle className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default Layout;
