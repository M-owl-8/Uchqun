import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { clearAuth, getStoredAuth, storeAuth } from '../storage/authStorage';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/pushNotificationService';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  // TEMP STABILITY: Return safe defaults instead of throwing
  // This prevents crashes if hook is used outside provider
  if (!ctx) {
    if (__DEV__) {
      console.warn('[useAuth] Used outside AuthProvider, returning safe defaults');
    }
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      bootstrapping: false,
      isAuthenticated: false,
      isTeacher: false,
      isParent: false,
      login: async () => {
        if (__DEV__) {
          console.warn('[useAuth] login called but not in provider');
        }
        throw new Error('AuthProvider not available');
      },
      logout: async () => {
        if (__DEV__) {
          console.warn('[useAuth] logout called but not in provider');
        }
      },
      setUser: () => {},
      refreshUser: async () => {},
    };
  }
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await getStoredAuth();
        if (!alive) return;
        setUser(stored.user);
        setAccessToken(stored.accessToken || null);
        setRefreshToken(stored.refreshToken || null);
        if (stored.accessToken && stored.user) {
          if (__DEV__) {
            registerForPushNotifications().catch((err) => console.warn('[AuthContext] Push register on load failed', err));
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[AuthContext] Bootstrap error:', error);
        }
      } finally {
        setBootstrapping(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = async (email, password) => {
    const payload = {
      email: typeof email === 'string' ? email.trim().toLowerCase() : email,
      password: typeof password === 'string' ? password.trim() : String(password || ''),
    };
    const resp = await api.post('/auth/login', payload);
    // Backend returns { success: true, accessToken, refreshToken, user }
    const { accessToken, refreshToken, user, success } = resp.data || {};
    if (!success || !accessToken || !user) {
      throw new Error(resp.data?.error || 'Invalid login response');
    }
    await storeAuth({ accessToken, refreshToken, user });
    setUser(user);
    setAccessToken(accessToken);
    setRefreshToken(refreshToken || null);
    // Register device for push notifications (teacher and parent)
    if (__DEV__) {
      registerForPushNotifications().catch((err) => console.warn('[AuthContext] Push register failed', err));
    }
    return user;
  };

  const logout = async () => {
    try {
      await unregisterPushNotifications();
    } catch (err) {
      if (__DEV__) {
        console.error('[AuthContext] Failed to unregister push notifications during logout:', err);
      }
    }
    await clearAuth();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  };

  const refreshUser = async () => {
    try {
      const resp = await api.get('/auth/me');
      const updatedUser = resp.data?.user || resp.data?.data || resp.data;
      if (updatedUser && updatedUser.id) {
        setUser(updatedUser);
        const stored = await getStoredAuth();
        await storeAuth({ ...stored, user: updatedUser });
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[AuthContext] refreshUser error:', error);
      }
    }
  };

  const role = (user?.role || '').toLowerCase();

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      bootstrapping,
      isAuthenticated: !!user && !!accessToken,
      // Role checks: use normalized lowercase so backend "Parent" / "parent" both work
      isTeacher: role === 'teacher',
      isParent: role === 'parent',
      isAdmin: role === 'admin',
      isReception: role === 'reception',
      login,
      logout,
      setUser, // Add setUser for compatibility with web app
      refreshUser,
    }),
    [user, accessToken, refreshToken, bootstrapping, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
