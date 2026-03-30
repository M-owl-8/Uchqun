import { createAuthContext } from '@shared/context/createAuthContext';
const { AuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'government_accessToken',
  requiredRole: 'government',
});
export { AuthProvider, useAuth };
export default AuthContext;
