import { createContext, useContext, useState, useEffect } from 'react';
import { createApi } from '../services/api';

export function createAuthContext({ userStorageKey, tokenKey, requiredRole = null } = {}) {
  // tokenKey is accepted as an alias for userStorageKey so each app
  // has its own localStorage namespace (prevents cross-app session
  // collisions when users share a browser).
  const storageKey = userStorageKey || (tokenKey ? `${tokenKey}_user` : 'user');
  const AuthContext = createContext(null);

  // Single Axios instance shared by every AuthProvider rendered for this
  // factory call — re-created per render would re-attach interceptors.
  const api = createApi();

  function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : null;
      } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      (async () => {
        try {
          let res;
          try {
            res = await api.get('/auth/me');
          } catch (err) {
            if (err.response?.status !== 401) throw err;
            // Access token expired — attempt silent refresh then retry
            await api.post('/auth/refresh', {});
            res = await api.get('/auth/me');
          }
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
    }, [requiredRole, storageKey]);

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
