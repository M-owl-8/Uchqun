import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mirror the login / logout logic from shared/context/createAuthContext.
// Teacher app uses tokenKey: 'accessToken' and no requiredRole restriction
// (teachers AND parents share this app).
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

describe('teacher auth – login', () => {
  const STORAGE_KEY = 'user';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = undefined;
    mockApi = { post: vi.fn(), get: vi.fn() };
  });

  it('stores the teacher user in localStorage and calls setUser on success', async () => {
    const fakeUser = { id: 10, email: 'teacher@school.uz', role: 'teacher' };
    mockApi.post.mockResolvedValueOnce({ data: { user: fakeUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: null, setUser });
    const result = await login('teacher@school.uz', 'pass');

    expect(result.user).toEqual(fakeUser);
    expect(capturedUser).toEqual(fakeUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(fakeUser);
  });

  it('allows a parent user to log in (no role restriction on teacher app)', async () => {
    const parentUser = { id: 20, email: 'parent@school.uz', role: 'parent' };
    mockApi.post.mockResolvedValueOnce({ data: { user: parentUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: null, setUser });
    await login('parent@school.uz', 'pass');

    expect(capturedUser?.role).toBe('parent');
  });

  it('rejects with the API error when credentials are wrong', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('401 Unauthorized'));

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: null, setUser });

    await expect(login('bad@bad.com', 'wrong')).rejects.toThrow('401');
    expect(capturedUser).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests – logout
// ---------------------------------------------------------------------------

describe('teacher auth – logout', () => {
  const STORAGE_KEY = 'user';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = 'initial';
    mockApi = { post: vi.fn() };
  });

  it('removes the user from localStorage and sets state to null', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 10, role: 'teacher' }));
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('clears local state even when backend logout endpoint throws', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 10, role: 'teacher' }));
    mockApi.post.mockRejectedValueOnce(new Error('503 Service Unavailable'));

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('does not throw when called with no active session', async () => {
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await expect(logout()).resolves.toBeUndefined();
    expect(capturedUser).toBeNull();
  });
});
