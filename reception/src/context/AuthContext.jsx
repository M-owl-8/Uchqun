import { createAuthContext } from '@shared/context/createAuthContext';
import api from '../services/api';

const { AuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'reception_accessToken',
  requiredRole: 'reception',
  api,
});

export { AuthProvider, useAuth };
export default AuthContext;
