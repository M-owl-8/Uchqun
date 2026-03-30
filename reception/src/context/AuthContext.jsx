import { createAuthContext } from '@shared/context/createAuthContext';
const { AuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'reception_accessToken',
  requiredRole: 'reception',
});
export { AuthProvider, useAuth };
export default AuthContext;
