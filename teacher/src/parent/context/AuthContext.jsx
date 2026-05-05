// Parent section re-uses the shared teacher AuthContext.
// Do NOT create a separate AuthProvider here — the outer AuthProvider in App.jsx covers all routes.
export { AuthProvider, useAuth } from '../../shared/context/AuthContext';
