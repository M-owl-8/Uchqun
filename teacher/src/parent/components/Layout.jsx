import { Outlet, useLocation } from 'react-router-dom';
import DesktopTopNav from './DesktopTopNav';
import MobileTabBar from './MobileTabBar';
import MobileTopBar from './MobileTopBar';

const Layout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-p-paper text-p-ink">
      <div className="hidden lg:block">
        <DesktopTopNav />
      </div>
      <div className="lg:hidden">
        <MobileTopBar />
      </div>

      <main
        key={location.pathname}
        className="page-fade-in max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-10 lg:pt-6"
      >
        <Outlet />
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileTabBar />
      </div>
    </div>
  );
};

export default Layout;
