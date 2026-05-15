import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();

  // Only block rendering when there is no cached user at all.
  // If localStorage already has a user, render optimistically while
  // the background /auth/me check runs — eliminates the double-spinner
  // on every reload.
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

