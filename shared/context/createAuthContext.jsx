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
      // Validate session via HTTP-only cookie — no localStorage token dependency
      api.get('/auth/me')
        .then((res) => {
          const userData = res.data;
          if (requiredRole && userData.role !== requiredRole) {
            localStorage.removeItem(storageKey);
            setUser(null);
          } else {
            try { localStorage.setItem(storageKey, JSON.stringify(userData)); } catch { /* quota */ }
            setUser(userData);
          }
        })
        .catch(() => {
          localStorage.removeItem(storageKey);
          setUser(null);
        })
        .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (email, password) => {
      const res = await api.post('/auth/login', { email, password });
      const { user: userData } = res.data;
      if (requiredRole && userData.role !== requiredRole) {
        throw new Error(`Access denied. Required role: ${requiredRole}`);
      }
      try { localStorage.setItem(storageKey, JSON.stringify(userData)); } catch { /* quota */ }
      setUser(userData);
      return res.data;
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
