import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireRole, allowMustChange = false }) => {
  const { isAuthenticated, loading, isTeacher, isParent, user } = useAuth();

  // Block rendering during auth verification regardless of stale localStorage data.
  // The old guard `loading && !user` allowed zombie rendering: if localStorage had
  // a stale user, the full authenticated layout mounted immediately and fired all
  // page API requests before auth/me validated the session (request storm on 401).
  if (loading) {
    // Palette-aware loading state so the auth spinner blends seamlessly into the
    // target portal's identity. Parent routes use the warm p-* palette so the
    // user perceives ONE continuous load (auth → content) instead of two
    // visually distinct ones (purple auth → warm content) which felt like a
    // double reload.
    const isParentRoute = requireRole === 'parent';
    const bg = isParentRoute ? 'bg-p-paper' : 'bg-surface';
    const ring = isParentRoute
      ? 'border-p-sepia-200 border-t-p-brand-600'
      : 'border-brand-200 border-t-brand-600';
    return (
      <div className={`flex items-center justify-center min-h-screen ${bg}`}>
        <div
          role="status"
          aria-label="Loading"
          className={`h-12 w-12 ${ring} border-4 rounded-full animate-spin`}
        />
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