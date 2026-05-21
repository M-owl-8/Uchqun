/**
 * Binding test: AppRoutes redirects to /government/change-password when
 * mustChangePassword=true, and renders normal pages when false.
 * Proves the JSX wiring (isAuthenticated && mustChangePassword && !isChangePasswordPage → <Navigate>)
 * is correct — NOT just the logic (that's in GovAuthContext.test.js).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// --- Auth context mock ---
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: mockUseAuth,
  AuthProvider: ({ children }) => <>{children}</>,
}));

// --- Infrastructure mocks (only App, not AppRoutes, uses these directly) ---
vi.mock('../components/ProtectedRoute', () => ({
  default: ({ children }) => <>{children}</>,
}));

// Layout must render <Outlet /> so child routes are shown
vi.mock('../components/Layout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { default: () => <Outlet /> };
});

vi.mock('@shared/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

// ErrorBoundary is a passthrough in the happy path
vi.mock('@shared/components/ErrorBoundary', () => ({
  default: ({ children }) => <>{children}</>,
}));

// OfflineBanner, Toast, ToastProvider — imported by App, not rendered by AppRoutes
vi.mock('@shared/components/OfflineBanner', () => ({ OfflineBanner: () => null }));
vi.mock('@shared/components/Toast', () => ({ ToastContainer: () => null }));
vi.mock('@shared/context/ToastContext', () => ({
  ToastProvider: ({ children }) => <>{children}</>,
}));

// --- Page component mocks ---
vi.mock('../pages/Login',          () => ({ default: () => <div data-testid="login" /> }));
vi.mock('../pages/Dashboard',      () => ({ default: () => <div data-testid="dashboard" /> }));
vi.mock('../pages/Schools',        () => ({ default: () => <div data-testid="schools" /> }));
vi.mock('../pages/SchoolDetail',   () => ({ default: () => <div data-testid="school-detail" /> }));
vi.mock('../pages/Ratings',        () => ({ default: () => <div data-testid="ratings" /> }));
vi.mock('../pages/Platform',       () => ({ default: () => <div data-testid="platform" /> }));
vi.mock('../pages/Profile',        () => ({ default: () => <div data-testid="profile" /> }));
vi.mock('../pages/Settings',       () => ({ default: () => <div data-testid="settings" /> }));
vi.mock('../pages/AdminDetails',   () => ({ default: () => <div data-testid="admin-details" /> }));
vi.mock('../pages/AuditLog',       () => ({ default: () => <div data-testid="audit-log" /> }));
vi.mock('../pages/AIWarnings',     () => ({ default: () => <div data-testid="ai-warnings" /> }));
vi.mock('../pages/NotFound',       () => ({ default: () => <div data-testid="not-found" /> }));
vi.mock('../pages/ChangePassword', () => ({ default: () => <div data-testid="change-password" /> }));

// Import AppRoutes after all mocks are registered
const { AppRoutes } = await import('../App.jsx');

// Auth shapes
const authedUser = (extra = {}) => ({
  isAuthenticated: true,
  isGovernment: true,
  loading: false,
  user: { id: 'g1', role: 'government' },
  ...extra,
});

const renderAt = (path, authOverrides = {}) => {
  mockUseAuth.mockReturnValue(authedUser(authOverrides));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
};

describe('AppRoutes — password-change redirect binding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[mustChangePassword=true] /government/schools → redirects; change-password page renders', async () => {
    renderAt('/government/schools', { mustChangePassword: true });
    await waitFor(() => {
      expect(screen.getByTestId('change-password')).toBeInTheDocument();
      expect(screen.queryByTestId('schools')).not.toBeInTheDocument();
    });
  });

  it('[mustChangePassword=true] /government (index) → redirects; change-password page renders', async () => {
    renderAt('/government', { mustChangePassword: true });
    await waitFor(() => {
      expect(screen.getByTestId('change-password')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });
  });

  it('[mustChangePassword=true] /government/change-password → NO redirect loop; page renders', async () => {
    // Already at the change-password page; must NOT redirect again
    renderAt('/government/change-password', { mustChangePassword: true });
    await waitFor(() => {
      expect(screen.getByTestId('change-password')).toBeInTheDocument();
    });
  });

  it('[mustChangePassword=false] /government → dashboard renders; change-password absent', async () => {
    renderAt('/government', { mustChangePassword: false });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('change-password')).not.toBeInTheDocument();
    });
  });

  it('[mustChangePassword=false] /government/schools → schools page renders; change-password absent', async () => {
    renderAt('/government/schools', { mustChangePassword: false });
    await waitFor(() => {
      expect(screen.getByTestId('schools')).toBeInTheDocument();
      expect(screen.queryByTestId('change-password')).not.toBeInTheDocument();
    });
  });
});
