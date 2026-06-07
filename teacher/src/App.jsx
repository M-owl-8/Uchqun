import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { OfflineBanner } from '../../shared/components/OfflineBanner';
import { AuthProvider } from './shared/context/AuthContext';
import { SocketProvider } from './shared/context/SocketContext';
import { ToastProvider } from './shared/context/ToastContext';
import { NotificationProvider } from './shared/context/NotificationContext';
import { ToastContainer } from './shared/components/Toast';
import ProtectedRoute from './shared/components/ProtectedRoute';
import { useAuth } from './shared/context/AuthContext';
import { useSocket } from './shared/context/SocketContext';
import { useToast } from './shared/context/ToastContext';
import Login from './pages/Login';

// Listens for server-pushed force-logout events (e.g. account suspended by admin, school archived).
// Must sit inside AuthProvider, SocketProvider, ToastProvider, and Router.
function ForceLogoutHandler() {
  const { logout } = useAuth();
  const { on, off } = useSocket();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    const handle = (data) => {
      if (data?.reason === 'SCHOOL_ARCHIVED') {
        showError("Maktabingiz arxivlandi. Iltimos, adminizga murojaat qiling.");
      }
      logout();
      navigate('/login', { replace: true });
    };
    on('user:force-logout', handle);
    return () => off('user:force-logout', handle);
  }, [on, off, logout, navigate, showError]);
  return null;
}
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Meals from './pages/Meals';
import Media from './pages/Media';
import MonitoringJournal from './pages/MonitoringJournal';
// TP-IA-REDESIGN: 5-tab shell pages — these wrap the page components
// that used to be reached directly (Activities/Chat/AIWarnings/Profile/
// Settings/DailyReflection/TherapyManagement). Those imports moved
// into the shells (Reja, Xabar, Men). App.jsx now only knows the shell.
import Bolalar from './pages/Bolalar';
import Reja from './pages/Reja';
import Xabar from './pages/Xabar';
import Men from './pages/Men';
import Attendance from './pages/Attendance';
import ChildDetail from './pages/ChildDetail';
import IrrShell from './pages/IrrShell';
import ParentApp from './parent/ParentApp';
import ParentDashboard from './parent/pages/Dashboard';
import ChildProfile from './parent/pages/ChildProfile';
import ParentActivities from './parent/pages/Activities';
import ParentMeals from './parent/pages/Meals';
import ParentMedia from './parent/pages/Media';
import ParentChat from './parent/pages/Chat';
import Notifications from './parent/pages/Notifications';
import Help from './parent/pages/Help';
import TeacherRating from './parent/pages/TeacherRating';
import ParentSettings from './parent/pages/Settings';
import Therapy from './parent/pages/Therapy';
import ChildIRR from './parent/pages/ChildIRR';
import ParentAttendance from './parent/pages/Attendance';
import ParentJournal from './parent/pages/Journal';
import TeacherChangePassword from './pages/ChangePassword';
import ParentChangePassword from './parent/pages/ChangePassword';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <Router>
                <ForceLogoutHandler />
                <OfflineBanner />
                <ToastContainer />
                <Routes>
                  <Route path="/login" element={<Login />} />

                  <Route
                    path="/teacher/change-password"
                    element={
                      <ProtectedRoute requireRole="teacher" allowMustChange>
                        <TeacherChangePassword />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/change-password"
                    element={
                      <ProtectedRoute requireRole="parent" allowMustChange>
                        <ParentChangePassword />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute requireRole="parent">
                        <ParentApp />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ErrorBoundary><ParentDashboard /></ErrorBoundary>} />
                    <Route path="child" element={<ErrorBoundary><ChildProfile /></ErrorBoundary>} />
                    <Route path="activities" element={<ErrorBoundary><ParentActivities /></ErrorBoundary>} />
                    <Route path="meals" element={<ErrorBoundary><ParentMeals /></ErrorBoundary>} />
                    <Route path="media" element={<ErrorBoundary><ParentMedia /></ErrorBoundary>} />
                    <Route path="chat" element={<ErrorBoundary><ParentChat /></ErrorBoundary>} />
                    <Route path="notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
                    <Route path="help" element={<ErrorBoundary><Help /></ErrorBoundary>} />
                    <Route path="rating" element={<ErrorBoundary><TeacherRating /></ErrorBoundary>} />
                    <Route path="settings" element={<ErrorBoundary><ParentSettings /></ErrorBoundary>} />
                    <Route path="therapy" element={<ErrorBoundary><Therapy /></ErrorBoundary>} />
                    <Route path="irr" element={<ErrorBoundary><ChildIRR /></ErrorBoundary>} />
                    <Route path="attendance" element={<ErrorBoundary><ParentAttendance /></ErrorBoundary>} />
                    <Route path="journal" element={<ErrorBoundary><ParentJournal /></ErrorBoundary>} />
                  </Route>

                  <Route
                    path="/teacher"
                    element={
                      <ProtectedRoute requireRole="teacher">
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    {/* TP-IA-REDESIGN — 5-tab IA */}
                    <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                    <Route path="bolalar" element={<ErrorBoundary><Bolalar /></ErrorBoundary>} />
                    <Route path="reja" element={<ErrorBoundary><Reja /></ErrorBoundary>} />
                    <Route path="xabar" element={<ErrorBoundary><Xabar /></ErrorBoundary>} />
                    <Route path="men" element={<ErrorBoundary><Men /></ErrorBoundary>} />

                    {/* Deep-link compatibility — old sidebar URLs still work */}
                    <Route path="parents" element={<Navigate to="/teacher/bolalar" replace />} />
                    <Route path="profile" element={<Navigate to="/teacher/men?tab=profile" replace />} />
                    <Route path="settings" element={<Navigate to="/teacher/men?tab=settings" replace />} />
                    <Route path="reflection" element={<Navigate to="/teacher/men?tab=reflection" replace />} />
                    <Route path="activities" element={<Navigate to="/teacher/reja?tab=activities" replace />} />
                    <Route path="therapy" element={<Navigate to="/teacher/reja?tab=therapy" replace />} />
                    <Route path="chat" element={<Navigate to="/teacher/xabar?tab=chat" replace />} />
                    <Route path="warnings" element={<Navigate to="/teacher/xabar?tab=warnings" replace />} />
                    <Route path="ai-warnings" element={<Navigate to="/teacher/xabar?tab=warnings" replace />} />

                    {/* Per-child + per-feature pages remain as deep-link routes */}
                    <Route path="attendance" element={<ErrorBoundary><Attendance /></ErrorBoundary>} />
                    <Route path="meals" element={<ErrorBoundary><Meals /></ErrorBoundary>} />
                    <Route path="media" element={<ErrorBoundary><Media /></ErrorBoundary>} />
                    <Route path="monitoring" element={<ErrorBoundary><MonitoringJournal /></ErrorBoundary>} />
                    <Route path="children/:id" element={<ErrorBoundary><ChildDetail /></ErrorBoundary>} />
                    <Route path="children/:id/irr" element={<ErrorBoundary><IrrShell /></ErrorBoundary>} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Router>
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
