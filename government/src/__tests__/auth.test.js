import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Government app uses:
//   tokenKey: 'government_accessToken'
//   requiredRole: 'government'
//   userStorageKey defaults to 'user'
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

describe('government auth – login', () => {
  const STORAGE_KEY = 'user';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = undefined;
    mockApi = { post: vi.fn(), get: vi.fn() };
  });

  it('logs in a government user and stores in localStorage', async () => {
    const govUser = { id: 7, email: 'gov@ministry.uz', role: 'government' };
    mockApi.post.mockResolvedValueOnce({ data: { user: govUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'government', setUser });
    const result = await login('gov@ministry.uz', 'secret');

    expect(result.user.role).toBe('government');
    expect(capturedUser).toEqual(govUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(govUser);
  });

  it('throws "Access denied" when role is not government', async () => {
    const adminUser = { id: 1, email: 'admin@school.uz', role: 'admin' };
    mockApi.post.mockResolvedValueOnce({ data: { user: adminUser } });

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'government', setUser });

    await expect(login('admin@school.uz', 'pass')).rejects.toThrow('Access denied');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeUndefined();
  });

  it('does not touch localStorage on API failure', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('403 Forbidden'));

    const login = makeLoginFn({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'government', setUser });

    await expect(login('gov@ministry.uz', 'wrong')).rejects.toThrow('403');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests – logout
// ---------------------------------------------------------------------------

describe('government auth – logout', () => {
  const STORAGE_KEY = 'user';
  let mockApi;
  let capturedUser;
  const setUser = (u) => { capturedUser = u; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = 'initial';
    mockApi = { post: vi.fn() };
  });

  it('clears localStorage and sets user to null on logout', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 7, role: 'government' }));
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('guarantees local cleanup even when the server returns an error', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 7, role: 'government' }));
    mockApi.post.mockRejectedValueOnce(new Error('network failure'));

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(capturedUser).toBeNull();
  });

  it('completes without error when no session exists', async () => {
    mockApi.post.mockResolvedValueOnce({});

    const logout = makeLogoutFn({ api: mockApi, userStorageKey: STORAGE_KEY, setUser });
    await expect(logout()).resolves.toBeUndefined();
    expect(capturedUser).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests – session validation
// ---------------------------------------------------------------------------

describe('government auth – session validation on mount', () => {
  const STORAGE_KEY = 'user';
  let mockApi;
  let capturedUser;
  let loadingDone;
  const setUser = (u) => { capturedUser = u; };
  const setLoading = (v) => { loadingDone = !v; };

  beforeEach(() => {
    localStorage.clear();
    capturedUser = undefined;
    loadingDone = false;
    mockApi = { get: vi.fn() };
  });

  it('sets user when /auth/me returns a government role', async () => {
    const govUser = { id: 7, role: 'government' };
    mockApi.get.mockResolvedValueOnce({ data: govUser });

    await validateSession({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'government', setUser, setLoading });

    expect(capturedUser).toEqual(govUser);
    expect(loadingDone).toBe(true);
  });

  it('clears user when /auth/me returns a mismatched role', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { id: 1, role: 'teacher' } });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1, role: 'teacher' }));

    await validateSession({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'government', setUser, setLoading });

    expect(capturedUser).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears user and finishes loading on /auth/me network error', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network Error'));

    await validateSession({ api: mockApi, userStorageKey: STORAGE_KEY, requiredRole: 'government', setUser, setLoading });

    expect(capturedUser).toBeNull();
    expect(loadingDone).toBe(true);
  });
});
