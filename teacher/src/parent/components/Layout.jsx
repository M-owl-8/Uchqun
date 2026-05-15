import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import JoyfulBackground from '../../shared/components/JoyfulBackground';
import { MessageCircle } from 'lucide-react';

const Layout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Joyful Background - Sky, Sun, Clouds, Hills */}
      <JoyfulBackground />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-40">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 pb-24 lg:pb-6 pt-8 lg:pt-8 relative z-10">
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
          <a
            href="/chat"
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition"
            aria-label="Chat"
          >
            <MessageCircle className="w-6 h-6" />
          </a>
        </div>
      )}
    </div>
  );
};

export default Layout;
