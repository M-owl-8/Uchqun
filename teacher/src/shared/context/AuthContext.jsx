import { createAuthContext } from '@shared/context/createAuthContext';
import api from '../services/api';

const { AuthProvider: BaseAuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'accessToken',
  api,
});

// Teacher app wraps with WebView logout support
function AuthProvider({ children }) {
  return <BaseAuthProvider>{children}</BaseAuthProvider>;
}

export { AuthProvider, useAuth };
export default AuthContext;
