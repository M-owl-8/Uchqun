import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Dashboard from './pages/Dashboard';
import ParentManagement from './pages/ParentManagement';
import TeacherManagement from './pages/TeacherManagement';
import GroupManagement from './pages/GroupManagement';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Documents from './pages/Documents';
import ParentWizardPage from './pages/ParentWizard/ParentWizardPage';
import WizardCompletePage from './pages/ParentWizard/WizardCompletePage';

const AppRoutes = () => {
  const { isAuthenticated, isReception, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-paper">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
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
        <Route path="parents/new" element={<ErrorBoundary><ParentWizardPage /></ErrorBoundary>} />
        <Route path="teachers" element={<ErrorBoundary><TeacherManagement /></ErrorBoundary>} />
        <Route path="groups" element={<ErrorBoundary><GroupManagement /></ErrorBoundary>} />
        <Route path="documents" element={<ErrorBoundary><Documents /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
        <Route path="wizard/complete" element={<ErrorBoundary><WizardCompletePage /></ErrorBoundary>} />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated && isReception ? '/reception' : '/login'} replace />} />
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
