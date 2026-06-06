// TP-AUTH-ZOMBIE — regression test for expired-session zombie UI
//
// Root cause: ProtectedRoute's old guard `loading && !user` let stale localStorage
// hydration render the full authenticated layout before auth/me validated the session.
// When auth/me returned 401 (expired token), all mounted page components had already
// fired their API requests — producing the 401/403 storm seen in three production
// captures. Fix: guard on `loading` alone so the spinner always blocks child rendering
// until auth/me resolves.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }) => React.createElement('div', { 'data-testid': 'redirect', 'data-to': to }),
}));

vi.mock('../shared/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../shared/components/LoadingSpinner', () => ({
  default: ({ size }) => React.createElement('div', { 'data-testid': 'spinner', 'data-size': size }),
}));

const Child = () => React.createElement('div', { 'data-testid': 'protected-child' }, 'authenticated content');

describe('ProtectedRoute — zombie session guard (TP-AUTH-ZOMBIE)', () => {
  let useAuth;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../shared/context/AuthContext');
    useAuth = mod.useAuth;
  });

  it('shows spinner when loading=true even with stale localStorage user (no zombie render)', async () => {
    // Simulates: page load, localStorage has old user, auth/me still in-flight
    useAuth.mockReturnValue({
      loading: true,
      user: { id: 1, role: 'teacher' },
      isAuthenticated: true,
      isTeacher: true,
      isParent: false,
    });

    const { default: ProtectedRoute } = await import('../shared/components/ProtectedRoute');
    const { queryByTestId } = render(
      React.createElement(ProtectedRoute, { requireRole: 'teacher' }, React.createElement(Child))
    );

    // Spinner must block, child must NOT mount (no API requests fire)
    expect(queryByTestId('spinner')).not.toBeNull();
    expect(queryByTestId('protected-child')).toBeNull();
  });

  it('shows spinner when loading=true and no user (cold start — no localStorage)', async () => {
    useAuth.mockReturnValue({
      loading: true,
      user: null,
      isAuthenticated: false,
      isTeacher: false,
      isParent: false,
    });

    const { default: ProtectedRoute } = await import('../shared/components/ProtectedRoute');
    const { queryByTestId } = render(
      React.createElement(ProtectedRoute, { requireRole: 'teacher' }, React.createElement(Child))
    );

    expect(queryByTestId('spinner')).not.toBeNull();
    expect(queryByTestId('protected-child')).toBeNull();
  });

  it('redirects to /login when loading=false and user cleared (expired session resolved)', async () => {
    // Simulates: auth/me 401, refresh failed, setUser(null) called — loading done
    useAuth.mockReturnValue({
      loading: false,
      user: null,
      isAuthenticated: false,
      isTeacher: false,
      isParent: false,
    });

    const { default: ProtectedRoute } = await import('../shared/components/ProtectedRoute');
    const { queryByTestId } = render(
      React.createElement(ProtectedRoute, { requireRole: 'teacher' }, React.createElement(Child))
    );

    const redirect = queryByTestId('redirect');
    expect(redirect).not.toBeNull();
    expect(redirect.getAttribute('data-to')).toBe('/login');
    expect(queryByTestId('protected-child')).toBeNull();
  });

  it('renders children when loading=false and teacher is authenticated', async () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { id: 1, role: 'teacher' },
      isAuthenticated: true,
      isTeacher: true,
      isParent: false,
    });

    const { default: ProtectedRoute } = await import('../shared/components/ProtectedRoute');
    const { queryByTestId } = render(
      React.createElement(ProtectedRoute, { requireRole: 'teacher' }, React.createElement(Child))
    );

    expect(queryByTestId('protected-child')).not.toBeNull();
    expect(queryByTestId('spinner')).toBeNull();
    expect(queryByTestId('redirect')).toBeNull();
  });
});
