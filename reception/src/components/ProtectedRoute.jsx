import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '@shared/components/LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isReception, loading, user } = useAuth();
  const location = useLocation();

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !isReception) {
    // D-55: this rendered <Navigate to="/login" replace /> with no state, so the
  // destination the user actually asked for was discarded. Every shared link,
  // bookmark and notification link landed them on the portal root instead, with
  // no indication anything had been dropped. Carry it through in location state.
  return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;

