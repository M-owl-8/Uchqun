import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        const userData = response.data;

        if (userData.role === 'admin') {
          setUser(userData);
          localStorage.setItem('superAdminUser', JSON.stringify(userData));
        } else {
          localStorage.removeItem('superAdminUser');
        }
      } catch {
        localStorage.removeItem('superAdminUser');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, accessToken, refreshToken } = response.data;

      if (userData.role !== 'admin') {
        return { success: false, error: 'Access denied. Admin role required.' };
      }

      if (accessToken) localStorage.setItem('super_admin_accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('superAdminUser', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem('superAdminUser');
    localStorage.removeItem('super_admin_accessToken');
    localStorage.removeItem('refreshToken');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
