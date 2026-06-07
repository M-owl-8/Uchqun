// TP-IA-REDESIGN — new teacher layout mirroring the parent IA.
//
// Desktop: TeacherTopNav at top (5 primary tabs + Settings + bell + new-observation FAB).
// Mobile:  TeacherMobileTopBar at top (brand + bell + FAB), TeacherMobileTabBar pinned to bottom.
//
// The old left sidebar is gone — its 11 destinations now live across the 5 tabs.
// Existing page components (Dashboard / Activities / Chat / etc.) are mounted
// unchanged inside the new shell. The IA shifts; page content does not.

import { Outlet, useLocation } from 'react-router-dom';
import TeacherTopNav from './TeacherTopNav';
import TeacherMobileTopBar from './TeacherMobileTopBar';
import TeacherMobileTabBar from './TeacherMobileTabBar';

const Layout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-paper">
      <div className="hidden lg:block">
        <TeacherTopNav />
      </div>
      <div className="lg:hidden">
        <TeacherMobileTopBar />
      </div>

      <main
        key={location.pathname}
        className="page-fade max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-10 lg:pt-6"
      >
        <Outlet />
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <TeacherMobileTabBar />
      </div>
    </div>
  );
};

export default Layout;
