import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';

// ── Mocks (vi.mock is hoisted — no top-level variables in factories) ──────────

vi.mock('../../shared/services/api', () => ({
  default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

let _isAuthenticated = false;
vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: _isAuthenticated }),
}));

const _on = vi.fn();
const _off = vi.fn();
vi.mock('../../shared/context/SocketContext', () => ({
  useSocket: () => ({ on: _on, off: _off }),
}));

// ── Import AFTER mocks ────────────────────────────────────────────────────────
import { NotificationProvider } from '../../shared/context/NotificationContext';
import api from '../../shared/services/api';

// ── Helper ────────────────────────────────────────────────────────────────────

function renderProvider() {
  return render(<NotificationProvider><span /></NotificationProvider>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationProvider — auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _isAuthenticated = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires ZERO notification requests when unauthenticated (login page)', async () => {
    _isAuthenticated = false;
    renderProvider();
    await act(async () => {});
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fires /notifications/count when authenticated', async () => {
    _isAuthenticated = true;
    api.get.mockResolvedValue({ data: { count: 3 } });
    renderProvider();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications/count'));
  });

  it('registers socket listener only when authenticated', async () => {
    _isAuthenticated = true;
    api.get.mockResolvedValue({ data: { count: 0 } });
    renderProvider();
    await waitFor(() => expect(_on).toHaveBeenCalledWith('notification:new', expect.any(Function)));
  });

  it('does NOT register socket listener when unauthenticated', async () => {
    _isAuthenticated = false;
    renderProvider();
    await act(async () => {});
    expect(_on).not.toHaveBeenCalled();
  });
});

describe('NotificationProvider — 429 backoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _isAuthenticated = true;
  });

  it('does not immediately retry after receiving 429', async () => {
    const err429 = Object.assign(new Error('rate limited'), {
      response: { status: 429, headers: { 'retry-after': '60' } },
    });
    api.get.mockRejectedValue(err429);

    renderProvider();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    // Simulate socket event — handler should be paused
    const socketHandler = _on.mock.calls.find(c => c[0] === 'notification:new')?.[1];
    if (socketHandler) {
      await act(async () => { await socketHandler(); });
    }
    // Still only 1 call — backoff gate blocked the retry
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('does not throw on 401 — returns silently', async () => {
    const err401 = Object.assign(new Error('unauthorized'), {
      response: { status: 401, headers: {} },
    });
    api.get.mockRejectedValue(err401);
    expect(() => renderProvider()).not.toThrow();
    await act(async () => {});
  });
});
