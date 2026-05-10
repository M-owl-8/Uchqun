import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { OfflineBanner } from '../../shared/components/OfflineBanner';
import i18n from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ParentManagement = lazy(() => import('./pages/ParentManagement'));
const TeacherManagement = lazy(() => import('./pages/TeacherManagement'));
const GroupManagement = lazy(() => import('./pages/GroupManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner size="md" />
  </div>
);

const AppRoutes = () => {
  const { isAuthenticated, isReception, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/reception" replace />} />

        <Route
          path="/reception"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="parents" element={<ErrorBoundary><ParentManagement /></ErrorBoundary>} />
          <Route path="teachers" element={<ErrorBoundary><TeacherManagement /></ErrorBoundary>} />
          <Route path="groups" element={<ErrorBoundary><GroupManagement /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
        </Route>

        <Route path="/" element={<Navigate to={isAuthenticated && isReception ? '/reception' : '/login'} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <OfflineBanner />
              <AppRoutes />
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

export default App;
