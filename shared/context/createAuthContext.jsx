import { createContext, useContext, useState, useEffect } from 'react';
import { createApi } from '../services/api';

export function createAuthContext({ userStorageKey = 'user', requiredRole = null } = {}) {
  const AuthContext = createContext(null);

  function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
      try {
        const stored = localStorage.getItem(userStorageKey);
        return stored ? JSON.parse(stored) : null;
      } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    const api = createApi();

    useEffect(() => {
      // Validate session via HTTP-only cookie — no localStorage token dependency
      api.get('/auth/me')
        .then((res) => {
          const userData = res.data;
          if (requiredRole && userData.role !== requiredRole) {
            localStorage.removeItem(userStorageKey);
            setUser(null);
          } else {
            try { localStorage.setItem(userStorageKey, JSON.stringify(userData)); } catch { /* quota */ }
            setUser(userData);
          }
        })
        .catch(() => {
          localStorage.removeItem(userStorageKey);
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
      try { localStorage.setItem(userStorageKey, JSON.stringify(userData)); } catch { /* quota */ }
      setUser(userData);
      return res.data;
    };

    const logout = async () => {
      try {
        await api.post('/auth/logout', {}, { withCredentials: true }).catch(() => {});
      } finally {
        localStorage.removeItem(userStorageKey);
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
        isSuperAdmin: role === 'super-admin',
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
