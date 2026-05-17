import { createAuthContext } from '@shared/context/createAuthContext';
import api from '../services/api';

const { AuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'admin_accessToken',
  requiredRole: 'admin',
  api,
});

export { AuthProvider, useAuth };
export default AuthContext;
