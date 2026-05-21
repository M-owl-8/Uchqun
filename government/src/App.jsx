import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { OfflineBanner } from '../../shared/components/OfflineBanner';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from '@shared/context/ToastContext';
import { ToastContainer } from '@shared/components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Ratings from './pages/Ratings';
import AdminDetails from './pages/AdminDetails';
import Profile from './pages/Profile';
import Platform from './pages/Platform';
import Settings from './pages/Settings';
import SchoolDetail from './pages/SchoolDetail';
import AuditLog from './pages/AuditLog';
import AIWarnings from './pages/AIWarnings';
import NotFound from './pages/NotFound';
import ChangePassword from './pages/ChangePassword';

export const AppRoutes = () => {
  const { isAuthenticated, isGovernment, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Block all navigation when mustChangePassword is true, except the change-password page itself.
  const isChangePasswordPage = location.pathname === '/government/change-password';
  if (isAuthenticated && mustChangePassword && !isChangePasswordPage) {
    return <Navigate to="/government/change-password" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/government" replace />} />

      <Route
        path="/government"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="change-password" element={<ErrorBoundary><ChangePassword /></ErrorBoundary>} />
        <Route path="schools" element={<ErrorBoundary><Schools /></ErrorBoundary>} />
        <Route path="schools/:id" element={<ErrorBoundary><SchoolDetail /></ErrorBoundary>} />
        <Route path="ratings" element={<ErrorBoundary><Ratings /></ErrorBoundary>} />
        <Route path="platform" element={<ErrorBoundary><Platform /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        <Route path="admin/:id" element={<ErrorBoundary><AdminDetails /></ErrorBoundary>} />
        <Route path="warnings" element={<ErrorBoundary><AIWarnings /></ErrorBoundary>} />
        <Route path="audit-log" element={<ErrorBoundary><AuditLog /></ErrorBoundary>} />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated && isGovernment ? '/government' : '/login'} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
