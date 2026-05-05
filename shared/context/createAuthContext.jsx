import { createContext, useContext, useState, useEffect } from 'react';
import { createApi } from '../services/api';

export function createAuthContext({ tokenKey, userStorageKey = 'user', requiredRole = null }) {
  const AuthContext = createContext(null);

  function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
      try {
        const stored = localStorage.getItem(userStorageKey);
        return stored ? JSON.parse(stored) : null;
      } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    const api = createApi({ tokenKey });

    useEffect(() => {
      const token = localStorage.getItem(tokenKey);
      if (!token) { setLoading(false); return; }
      api.get('/auth/me')
        .then((res) => {
          const userData = res.data;
          if (requiredRole && userData.role !== requiredRole) {
            localStorage.removeItem(tokenKey);
            localStorage.removeItem(userStorageKey);
            localStorage.removeItem('refreshToken');
            setUser(null);
          } else {
            try { localStorage.setItem(userStorageKey, JSON.stringify(userData)); } catch { /* quota */ }
            setUser(userData);
          }
        })
        .catch(() => {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(userStorageKey);
          localStorage.removeItem('refreshToken');
          setUser(null);
        })
        .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (email, password) => {
      const res = await api.post('/auth/login', { email, password }, { withCredentials: true });
      const { accessToken, refreshToken, user: userData } = res.data;
      if (requiredRole && userData.role !== requiredRole) {
        throw new Error(`Access denied. Required role: ${requiredRole}`);
      }
      localStorage.setItem(tokenKey, accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      try { localStorage.setItem(userStorageKey, JSON.stringify(userData)); } catch { /* quota */ }
      setUser(userData);
      return res.data;
    };

    const logout = async () => {
      try {
        await api.post('/auth/logout', {}, { withCredentials: true }).catch(() => {});
      } finally {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem('refreshToken');
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
