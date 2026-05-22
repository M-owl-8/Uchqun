import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { OfflineBanner } from '../../shared/components/OfflineBanner';
import i18n from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from '@shared/context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from '@shared/components/Toast';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminRegister from './pages/AdminRegister';
import Dashboard from './pages/Dashboard';
import ReceptionManagement from './pages/ReceptionManagement';
import ParentManagement from './pages/ParentManagement';
import TeacherManagement from './pages/TeacherManagement';
import GroupManagement from './pages/GroupManagement';
import SchoolRatings from './pages/SchoolRatings';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import DocumentApprovalQueue from './pages/DocumentApprovalQueue';
import AIWarnings from './pages/AIWarnings';
import TherapyManagement from './pages/TherapyManagement';
import BulkImport from './pages/BulkImport';
import ChangePassword from './pages/ChangePassword';
import NotFound from './pages/NotFound';

const AppRoutes = () => {
  const { isAuthenticated, isAdmin, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isChangePasswordPage = location.pathname === '/admin/change-password';
  if (isAuthenticated && isAdmin && mustChangePassword && !isChangePasswordPage) {
    return <Navigate to="/admin/change-password" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/admin" replace />} />
      <Route path="/admin-register" element={!isAuthenticated ? <AdminRegister /> : <Navigate to="/admin" replace />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="change-password" element={<ErrorBoundary><ChangePassword /></ErrorBoundary>} />
        <Route path="receptions" element={<ErrorBoundary><ReceptionManagement /></ErrorBoundary>} />
        <Route path="parents" element={<ErrorBoundary><ParentManagement /></ErrorBoundary>} />
        <Route path="teachers" element={<ErrorBoundary><TeacherManagement /></ErrorBoundary>} />
        <Route path="groups" element={<ErrorBoundary><GroupManagement /></ErrorBoundary>} />
        <Route path="school-ratings" element={<ErrorBoundary><SchoolRatings /></ErrorBoundary>} />
<Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        <Route path="documents" element={<ErrorBoundary><DocumentApprovalQueue /></ErrorBoundary>} />
        <Route path="ai-warnings" element={<ErrorBoundary><AIWarnings /></ErrorBoundary>} />
        <Route path="therapy" element={<ErrorBoundary><TherapyManagement /></ErrorBoundary>} />
        <Route path="import" element={<ErrorBoundary><BulkImport /></ErrorBoundary>} />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated && isAdmin ? '/admin' : '/login'} replace />} />
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
