import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers that mirror the login / logout logic in createAuthContext
// without needing a full React render tree.
// ---------------------------------------------------------------------------

/**
 * Minimal re-implementation of the login path from createAuthContext so we can
 * unit-test the branching logic (role check, localStorage write, error handling)
 * without mounting a component.
 */
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

/**
 * Minimal re-implementation of the logout path.
 */
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
// Tests
// ---------------------------------------------------------------------------

describe('admin auth – login', () => {
  const USER_KEY = 'user';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = undefined;
    mockApi = { post: vi.fn(), get: vi.fn() };
  });

  it('returns user data and stores it in localStorage on successful login', async () => {
    const fakeUser = { id: 1, email: 'admin@test.com', role: 'admin' };
    mockApi.post.mockResolvedValueOnce({ data: { user: fakeUser, token: 'tok' } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: USER_KEY, requiredRole: 'admin', setUser });
    const result = await login('admin@test.com', 'password');

    expect(result.user).toEqual(fakeUser);
    expect(capturedUser).toEqual(fakeUser);
    expect(JSON.parse(localStorage.getItem(USER_KEY))).toEqual(fakeUser);
  });

  it('throws when the returned user role does not match the required role', async () => {
    const wrongRoleUser = { id: 2, email: 'teacher@test.com', role: 'teacher' };
    mockApi.post.mockResolvedValueOnce({ data: { user: wrongRoleUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: USER_KEY, requiredRole: 'admin', setUser });

    await expect(login('teacher@test.com', 'password')).rejects.toThrow('Access denied');
    // user state should not have been set
    expect(capturedUser).toBeUndefined();
    // localStorage should not have been written
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('propagates network errors from the API call', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Network Error'));

    const login = makeLoginFn({ api: mockApi, userStorageKey: USER_KEY, requiredRole: 'admin', setUser });

    await expect(login('admin@test.com', 'password')).rejects.toThrow('Network Error');
    expect(capturedUser).toBeUndefined();
  });

  it('does not enforce role when requiredRole is null', async () => {
    const anyUser = { id: 3, email: 'anyone@test.com', role: 'parent' };
    mockApi.post.mockResolvedValueOnce({ data: { user: anyUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: USER_KEY, requiredRole: null, setUser });
    const result = await login('anyone@test.com', 'pw');

    expect(result.user.role).toBe('parent');
    expect(capturedUser).toEqual(anyUser);
  });
});

describe('admin auth – logout', () => {
  const USER_KEY = 'user';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = 'initial';
    mockApi = { post: vi.fn() };
  });

  it('clears localStorage and nullifies user on successful logout', async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, role: 'admin' }));
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: USER_KEY, setUser });
    await logout();

    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('still clears localStorage even when the logout API call fails', async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, role: 'admin' }));
    mockApi.post.mockRejectedValueOnce(new Error('server error'));

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: USER_KEY, setUser });
    await logout();

    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('is idempotent – can be called when user is already logged out', async () => {
    // Nothing in localStorage to begin with
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: USER_KEY, setUser });
    await logout();

    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });
});
