import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Reception app uses:
//   tokenKey: 'reception_accessToken'
//   requiredRole: 'reception'
//   userStorageKey defaults to 'user'
//
// Reception accounts also require documentsApproved + isActive on the backend,
// but by the time createAuthContext sees the user object it has already passed
// those server-side guards. We test the client-side role enforcement here.
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

// ---------------------------------------------------------------------------
// Tests – login
// ---------------------------------------------------------------------------

describe('reception auth – login', () => {
  const STORAGE_KEY = 'user';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = undefined;
    mockApi = { post: vi.fn(), get: vi.fn() };
  });

  it('logs in a valid reception user and persists to localStorage', async () => {
    const receptionUser = { id: 5, email: 'reception@school.uz', role: 'reception' };
    mockApi.post.mockResolvedValueOnce({ data: { user: receptionUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'reception', setUser });
    const result = await login('reception@school.uz', 'secret');

    expect(result.user.role).toBe('reception');
    expect(capturedUser).toEqual(receptionUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(receptionUser);
  });

  it('throws "Access denied" when a non-reception user tries to log in', async () => {
    const adminUser = { id: 1, email: 'admin@school.uz', role: 'admin' };
    mockApi.post.mockResolvedValueOnce({ data: { user: adminUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'reception', setUser });

    await expect(login('admin@school.uz', 'secret')).rejects.toThrow('Access denied');
    expect(capturedUser).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not write localStorage when API throws a network error', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'reception', setUser });

    await expect(login('reception@school.uz', 'secret')).rejects.toThrow('ECONNREFUSED');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests – logout
// ---------------------------------------------------------------------------

describe('reception auth – logout', () => {
  const STORAGE_KEY = 'user';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = 'initial';
    mockApi = { post: vi.fn() };
  });

  it('removes user from localStorage and resets state on logout', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 5, role: 'reception' }));
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('clears session data even if server logout request fails', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 5, role: 'reception' }));
    mockApi.post.mockRejectedValueOnce(new Error('timeout'));

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('resolves successfully when there is no stored session', async () => {
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await expect(logout()).resolves.toBeUndefined();
    expect(capturedUser).toBeNull();
  });
});
