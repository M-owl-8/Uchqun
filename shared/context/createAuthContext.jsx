import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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

    useEffect(() => {
      const token = localStorage.getItem(tokenKey);
      if (!token) { setLoading(false); return; }
      const baseURL = import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api';
      axios.get(`${baseURL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => {
        const userData = res.data;
        if (requiredRole && userData.role !== requiredRole) {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(userStorageKey);
          localStorage.removeItem('refreshToken');
          setUser(null);
        } else {
          localStorage.setItem(userStorageKey, JSON.stringify(userData));
          setUser(userData);
        }
      }).catch(() => {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userStorageKey);
        localStorage.removeItem('refreshToken');
        setUser(null);
      }).finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
      const baseURL = import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api';
      const res = await axios.post(`${baseURL}/auth/login`, { email, password }, { withCredentials: true });
      const { accessToken, refreshToken, user: userData } = res.data;
      if (requiredRole && userData.role !== requiredRole) {
        throw new Error(`Access denied. Required role: ${requiredRole}`);
      }
      localStorage.setItem(tokenKey, accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem(userStorageKey, JSON.stringify(userData));
      setUser(userData);
      return res.data;
    };

    const logout = async () => {
      try {
        const token = localStorage.getItem(tokenKey);
        const baseURL = import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api';
        if (token) {
          await axios.post(`${baseURL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }).catch(() => {});
        }
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
