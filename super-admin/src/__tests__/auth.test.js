import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Super-admin app uses:
//   tokenKey: 'super_admin_accessToken'
//   userStorageKey: 'superAdminUser'
//   requiredRole: 'admin'  (super-admin users carry role='admin' on the server)
// ---------------------------------------------------------------------------

function makeLoginFn({ api, userStorageKey = 'user', requiredRole = null, setUser }) {
  return async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData } = res.data;
    if (requiredRole && userData.role !== requiredRole) {
      throw new Error(`Access denied. Required role: ${requiredRole}`);
    }
    try { localStorage.setItem(userStorageKey, JSON.stringify(userData)); } catch { /* quota */ }
    setUser(userData);
    return res.data;
  };
}

function makeLogoutFn({ api, userStorageKey = 'user', setUser }) {
  return async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true }).catch(() => {});
    } finally {
      localStorage.removeItem(userStorageKey);
      setUser(null);
    }
  };
}

// Session validation logic (from the useEffect in createAuthContext)
async function validateSession({ api, userStorageKey, requiredRole, setUser, setLoading }) {
  try {
    const res = await api.get('/auth/me');
    const userData = res.data;
    if (requiredRole && userData.role !== requiredRole) {
      localStorage.removeItem(userStorageKey);
      setUser(null);
    } else {
      try { localStorage.setItem(userStorageKey, JSON.stringify(userData)); } catch { /* quota */ }
      setUser(userData);
    }
  } catch {
    localStorage.removeItem(userStorageKey);
    setUser(null);
  } finally {
    setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Tests – login
// ---------------------------------------------------------------------------

describe('super-admin auth – login', () => {
  const STORAGE_KEY = 'superAdminUser';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = undefined;
    mockApi = { post: vi.fn(), get: vi.fn() };
  });

  it('logs in a super-admin (role=admin) and stores user under superAdminUser key', async () => {
    const superAdmin = { id: 1, email: 'super@platform.uz', role: 'admin' };
    mockApi.post.mockResolvedValueOnce({ data: { user: superAdmin } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'admin', setUser });
    await login('super@platform.uz', 'secure-pass');

    expect(capturedUser).toEqual(superAdmin);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(superAdmin);
  });

  it('rejects login attempt by a non-admin role', async () => {
    const teacherUser = { id: 99, email: 'teacher@school.uz', role: 'teacher' };
    mockApi.post.mockResolvedValueOnce({ data: { user: teacherUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'admin', setUser });

    await expect(login('teacher@school.uz', 'pass')).rejects.toThrow('Access denied');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('propagates error and leaves state clean on network failure', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Network Error'));

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'admin', setUser });

    await expect(login('super@platform.uz', 'pass')).rejects.toThrow('Network Error');
    expect(capturedUser).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests – logout
// ---------------------------------------------------------------------------

describe('super-admin auth – logout', () => {
  const STORAGE_KEY = 'superAdminUser';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = 'initial';
    mockApi = { post: vi.fn() };
  });

  it('removes superAdminUser from localStorage and nullifies state', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1, role: 'admin' }));
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('clears local session even when backend returns an error', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1, role: 'admin' }));
    mockApi.post.mockRejectedValueOnce(new Error('500'));

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('does not throw when called with no active session', async () => {
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await expect(logout()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests – session validation (useEffect on mount)
// ---------------------------------------------------------------------------

describe('super-admin auth – session validation', () => {
  const STORAGE_KEY = 'superAdminUser';
  let mockApi;
  let capturedUser;
  let loadingFinished;
  const setUser = (u) => { capturedUser = u; };
  const setLoading = (v) => { loadingFinished = !v; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = undefined;
    loadingFinished = false;
    mockApi = { get: vi.fn(), post: vi.fn() };
  });

  it('sets user state and storage when /auth/me returns a matching role', async () => {
    const superAdmin = { id: 1, email: 'super@platform.uz', role: 'admin' };
    mockApi.get.mockResolvedValueOnce({ data: superAdmin });

    await validateSession({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'admin', setUser, setLoading });

    expect(capturedUser).toEqual(superAdmin);
    expect(loadingFinished).toBe(true);
  });

  it('clears user when /auth/me returns a wrong role', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { id: 2, role: 'parent' } });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 2, role: 'parent' }));

    await validateSession({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'admin', setUser, setLoading });

    expect(capturedUser).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadingFinished).toBe(true);
  });

  it('clears user when /auth/me request fails (expired session)', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('401'));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1, role: 'admin' }));

    await validateSession({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'admin', setUser, setLoading });

    expect(capturedUser).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadingFinished).toBe(true);
  });
});
