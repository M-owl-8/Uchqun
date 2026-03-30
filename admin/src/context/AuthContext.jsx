import { createAuthContext } from '@shared/context/createAuthContext';
const { AuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'admin_accessToken',
  requiredRole: 'admin',
});
export { AuthProvider, useAuth };
export default AuthContext;
