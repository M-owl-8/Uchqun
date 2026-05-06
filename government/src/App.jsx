import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { OfflineBanner } from '../../shared/components/OfflineBanner';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Schools = lazy(() => import('./pages/Schools'));
const Ratings = lazy(() => import('./pages/Ratings'));
const Students = lazy(() => import('./pages/Students'));
const Teachers = lazy(() => import('./pages/Teachers'));
const Parents = lazy(() => import('./pages/Parents'));
const AdminDetails = lazy(() => import('./pages/AdminDetails'));
const Profile = lazy(() => import('./pages/Profile'));
const Platform = lazy(() => import('./pages/Platform'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner size="md" />
  </div>
);

const AppRoutes = () => {
  const { isAuthenticated, isGovernment, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <OfflineBanner />
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
          <Route path="schools" element={<ErrorBoundary><Schools /></ErrorBoundary>} />
          <Route path="students" element={<ErrorBoundary><Students /></ErrorBoundary>} />
          <Route path="teachers" element={<ErrorBoundary><Teachers /></ErrorBoundary>} />
          <Route path="parents" element={<ErrorBoundary><Parents /></ErrorBoundary>} />
          <Route path="ratings" element={<ErrorBoundary><Ratings /></ErrorBoundary>} />
          <Route path="platform" element={<ErrorBoundary><Platform /></ErrorBoundary>} />
          <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
          <Route path="admin/:id" element={<ErrorBoundary><AdminDetails /></ErrorBoundary>} />
        </Route>

        <Route path="/" element={<Navigate to={isAuthenticated && isGovernment ? '/government' : '/login'} replace />} />
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
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

export default App;
