import { createAuthContext } from '@shared/context/createAuthContext';
const { AuthProvider: BaseAuthProvider, useAuth, AuthContext } = createAuthContext({
  tokenKey: 'accessToken',
});

// Teacher app wraps with WebView logout support
function AuthProvider({ children }) {
  return <BaseAuthProvider>{children}</BaseAuthProvider>;
}

export { AuthProvider, useAuth };
export default AuthContext;
