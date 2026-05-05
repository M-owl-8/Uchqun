import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const AdminRegister = lazy(() => import('./pages/AdminRegister'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UsersStats = lazy(() => import('./pages/UsersStats'));
const PaymentManagement = lazy(() => import('./pages/PaymentManagement'));
const ReceptionManagement = lazy(() => import('./pages/ReceptionManagement'));
const ParentManagement = lazy(() => import('./pages/ParentManagement'));
const TeacherManagement = lazy(() => import('./pages/TeacherManagement'));
const GroupManagement = lazy(() => import('./pages/GroupManagement'));
const SchoolRatings = lazy(() => import('./pages/SchoolRatings'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner size="md" />
  </div>
);

const AppRoutes = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="receptions" element={<ErrorBoundary><ReceptionManagement /></ErrorBoundary>} />
          <Route path="parents" element={<ErrorBoundary><ParentManagement /></ErrorBoundary>} />
          <Route path="teachers" element={<ErrorBoundary><TeacherManagement /></ErrorBoundary>} />
          <Route path="groups" element={<ErrorBoundary><GroupManagement /></ErrorBoundary>} />
          <Route path="school-ratings" element={<ErrorBoundary><SchoolRatings /></ErrorBoundary>} />
          <Route path="users" element={<ErrorBoundary><UsersStats /></ErrorBoundary>} />
          <Route path="payments" element={<ErrorBoundary><PaymentManagement /></ErrorBoundary>} />
          <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        </Route>

        <Route path="/" element={<Navigate to={isAuthenticated && isAdmin ? '/admin' : '/login'} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
