import { createContext, useContext, useState, useEffect } from 'react';
import { createApi } from '../services/api';

export function createAuthContext({ userStorageKey, tokenKey, requiredRole = null, api: sharedApi = null } = {}) {
  // tokenKey is accepted as an alias for userStorageKey so each app
  // has its own localStorage namespace (prevents cross-app session
  // collisions when users share a browser).
  const storageKey = userStorageKey || (tokenKey ? `${tokenKey}_user` : 'user');
  const AuthContext = createContext(null);

  // Use the caller-provided api instance so the auth context and every page
  // component share exactly ONE refreshPromise mutex. Without this, the auth
  // context's private api instance and the portal's service-layer api instance
  // each try to refresh concurrently when the 15-min access token expires:
  // the first succeeds and rotates the refresh token; the second sends the now-
  // revoked token, gets 401, and calls clearAuth() — logging the user out.
  const api = sharedApi ?? createApi();

  function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : null;
      } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    // Wire clearAuth → SPA logout instead of window.location.replace.
    // The hard-reload path has a race: replace() fires before the new cookies
    // from a concurrent successful refresh are written to the browser jar,
    // so the page reloads with a revoked refresh token and the user must re-login.
    // Replacing it with setUser(null) lets ProtectedRoute do a SPA navigate
    // to /login — no reload, no cookie race.
    useEffect(() => {
      api.setOnUnauthenticated(() => {
        try { localStorage.removeItem(storageKey); } catch { /* quota */ }
        setUser(null);
      });
      return () => api.setOnUnauthenticated(null);
    // storageKey is a module-level constant — stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      (async () => {
        try {
          // The api interceptor transparently refreshes an expired access token
          // and retries this call — no manual refresh logic needed here.
          const res = await api.get('/auth/me');
          const userData = res.data.data ?? res.data;
          if (requiredRole && userData.role !== requiredRole) {
            localStorage.removeItem(storageKey);
            setUser(null);
          } else {
            try { localStorage.setItem(storageKey, JSON.stringify(userData)); } catch { /* quota */ }
            setUser(userData);
          }
        } catch {
          localStorage.removeItem(storageKey);
          setUser(null);
        } finally {
          setLoading(false);
        }
      })();
    // requiredRole and storageKey are module-level constants — stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (email, password) => {
      try {
        const res = await api.post('/auth/login', { email, password });
        const { user: userData } = res.data;
        if (requiredRole && userData.role !== requiredRole) {
          return { success: false, error: `Access denied. Required role: ${requiredRole}`, status: 403 };
        }
        try { localStorage.setItem(storageKey, JSON.stringify(userData)); } catch { /* quota */ }
        setUser(userData);
        return res.data;
      } catch (err) {
        const message = err.response?.data?.error || err.response?.data?.message || err.message;
        return { success: false, error: message, status: err.response?.status };
      }
    };

    const logout = async () => {
      try {
        await api.post('/auth/logout', {}, { withCredentials: true }).catch(() => {});
      } finally {
        localStorage.removeItem(storageKey);
        setUser(null);
      }
    };

    const role = user?.role || null;
    return (
      <AuthContext.Provider value={{
        user, setUser, loading, login, logout,
        isAuthenticated: !!user,
        isAdmin: role === 'admin',
        isReception: role === 'reception',
        isTeacher: role === 'teacher',
        isParent: role === 'parent',
        isGovernment: role === 'government',
        isBusiness: role === 'business',
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
  }

  return { AuthProvider, useAuth, AuthContext };
}
