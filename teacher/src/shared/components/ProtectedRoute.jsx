import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requireRole }) => {
  const { isAuthenticated, loading, isTeacher, isParent, user } = useAuth();

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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