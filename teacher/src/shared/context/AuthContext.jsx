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
    // Helper function to get cookie value
    const getCookie = (name) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };

    // First check localStorage synchronously to avoid unnecessary API calls
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken') || getCookie('accessToken');
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.id && userData.role) {
          // Set user immediately from localStorage
          setUser(userData);
          setLoading(false);
          
          // Verify token in background (non-blocking) - only if we have a token
          if (accessToken) {
            api.get('/auth/me')
              .then((response) => {
                const verifiedUser = response.data;
                if (verifiedUser) {
                  setUser(verifiedUser);
                  localStorage.setItem('user', JSON.stringify(verifiedUser));
                }
              })
              .catch((error) => {
                // Token invalid - only clear if it's a real auth error (not network error)
                if (error.response?.status === 401) {
                  localStorage.removeItem('user');
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('refreshToken');
                  setUser(null);
                }
              });
          }
          return;
        }
      } catch (parseError) {
        // Invalid stored user data
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
    
    // No valid stored user - check API if we have a token (cookie or localStorage)
    if (accessToken) {
      api.get('/auth/me')
        .then((response) => {
          const userData = response.data;
          if (userData) {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        })
        .catch((error) => {
          // Only clear if it's a real auth error
          if (error.response?.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // No token at all - just set loading to false
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, accessToken } = response.data;

      if (userData) {
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed',
      };
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    try {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'logout' }));
    } catch {
      // ignore
    }
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'teacher' || user?.role === 'admin',
    isParent: user?.role === 'parent',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
