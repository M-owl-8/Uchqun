import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requireRole, allowMustChange = false }) => {
  const { isAuthenticated, loading, isTeacher, isParent, user } = useAuth();

  // Block rendering during auth verification regardless of stale localStorage data.
  // The old guard `loading && !user` allowed zombie rendering: if localStorage had
  // a stale user, the full authenticated layout mounted immediately and fired all
  // page API requests before auth/me validated the session (request storm on 401).
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && !allowMustChange) {
    const changePath = requireRole === 'parent' ? '/change-password' : '/teacher/change-password';
    return <Navigate to={changePath} replace />;
  }

  // Enforce role-specific access and avoid redirect loops by falling back to login
  if (requireRole === 'teacher' && !isTeacher) {
    return isParent ? <Navigate to="/" replace /> : <Navigate to="/login" replace />;
  }

  if (requireRole === 'parent' && !isParent) {
    return isTeacher ? <Navigate to="/teacher" replace /> : <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;