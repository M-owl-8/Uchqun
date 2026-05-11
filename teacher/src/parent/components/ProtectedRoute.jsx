import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requireRole }) => {
  const { isAuthenticated, loading, isTeacher } = useAuth();

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

  // Check role requirement
  if (requireRole === 'teacher' && !isTeacher) {
    return <Navigate to="/" replace />;
  }

  if (requireRole === 'parent' && isTeacher) {
    return <Navigate to="/teacher" replace />;
  }

  return children;
};

export default ProtectedRoute;
