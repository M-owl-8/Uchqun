import { createAuthContext } from '@shared/context/createAuthContext';
const { AuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'super_admin_accessToken',
  userStorageKey: 'superAdminUser',
  requiredRole: 'admin',
});
export { AuthProvider, useAuth };
export default AuthContext;
