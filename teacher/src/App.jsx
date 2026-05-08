import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { OfflineBanner } from '../../shared/components/OfflineBanner';
import { AuthProvider } from './shared/context/AuthContext';
import { SocketProvider } from './shared/context/SocketContext';
import { ToastProvider } from './shared/context/ToastContext';
import { NotificationProvider } from './shared/context/NotificationContext';
import { ToastContainer } from './shared/components/Toast';
import ProtectedRoute from './shared/components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ParentManagement = lazy(() => import('./pages/ParentManagement'));
const Activities = lazy(() => import('./pages/Activities'));
const Meals = lazy(() => import('./pages/Meals'));
const Media = lazy(() => import('./pages/Media'));
const Chat = lazy(() => import('./pages/Chat'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const MonitoringJournal = lazy(() => import('./pages/MonitoringJournal'));
const TherapyManagement = lazy(() => import('./pages/TherapyManagement'));
const AIWarnings = lazy(() => import('./parent/pages/AIWarnings'));
const ParentApp = lazy(() => import('./parent/ParentApp'));
const ParentDashboard = lazy(() => import('./parent/pages/Dashboard'));
const ChildProfile = lazy(() => import('./parent/pages/ChildProfile'));
const ParentActivities = lazy(() => import('./parent/pages/Activities'));
const ParentMeals = lazy(() => import('./parent/pages/Meals'));
const ParentMedia = lazy(() => import('./parent/pages/Media'));
const ParentChat = lazy(() => import('./parent/pages/Chat'));
const Notifications = lazy(() => import('./parent/pages/Notifications'));
const Help = lazy(() => import('./parent/pages/Help'));
const AIChat = lazy(() => import('./parent/pages/AIChat'));
const TeacherRating = lazy(() => import('./parent/pages/TeacherRating'));
const ParentSettings = lazy(() => import('./parent/pages/Settings'));
const Therapy = lazy(() => import('./parent/pages/Therapy'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <NotificationProvider>
          <AuthProvider>
            <SocketProvider>
              <Router>
                <OfflineBanner />
                <ToastContainer />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />

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
                      <Route path="ai-chat" element={<ErrorBoundary><AIChat /></ErrorBoundary>} />
                      <Route path="chat" element={<ErrorBoundary><ParentChat /></ErrorBoundary>} />
                      <Route path="notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
                      <Route path="help" element={<ErrorBoundary><Help /></ErrorBoundary>} />
                      <Route path="rating" element={<ErrorBoundary><TeacherRating /></ErrorBoundary>} />
                      <Route path="settings" element={<ErrorBoundary><ParentSettings /></ErrorBoundary>} />
                      <Route path="therapy" element={<ErrorBoundary><Therapy /></ErrorBoundary>} />
                    </Route>

                    <Route
                      path="/teacher"
                      element={
                        <ProtectedRoute requireRole="teacher">
                          <Layout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                      <Route path="parents" element={<ErrorBoundary><ParentManagement /></ErrorBoundary>} />
                      <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
                      <Route path="activities" element={<ErrorBoundary><Activities /></ErrorBoundary>} />
                      <Route path="meals" element={<ErrorBoundary><Meals /></ErrorBoundary>} />
                      <Route path="media" element={<ErrorBoundary><Media /></ErrorBoundary>} />
                      <Route path="chat" element={<ErrorBoundary><Chat /></ErrorBoundary>} />
                      <Route path="monitoring" element={<ErrorBoundary><MonitoringJournal /></ErrorBoundary>} />
                      <Route path="therapy" element={<ErrorBoundary><TherapyManagement /></ErrorBoundary>} />
                      <Route path="ai-warnings" element={<ErrorBoundary><AIWarnings /></ErrorBoundary>} />
                      <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Router>
            </SocketProvider>
          </AuthProvider>
        </NotificationProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
