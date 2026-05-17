import { createAuthContext } from '@shared/context/createAuthContext';
import api from '../services/api';

const { AuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'government_accessToken',
  requiredRole: 'government',
  api,
});

export { AuthProvider, useAuth };
export default AuthContext;
