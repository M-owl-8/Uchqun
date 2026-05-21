import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key, opts) => opts?.defaultValue ?? _key }),
}));
vi.mock('../components/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('@shared/assets/ihma-logo.png', () => ({ default: 'logo.png' }));
vi.mock('@shared/components/LoadingSpinner', () => ({ default: () => <span>loading</span> }));

const Login = (await import('../pages/Login.jsx')).default;

describe('Login — GOV-005: suspended user error message', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows generic error for 401 without ACCOUNT_NOT_ACTIVE code', async () => {
    // Plain 401 (wrong password): error.code is not ACCOUNT_NOT_ACTIVE
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: 'Invalid credentials',
      status: 401,
    });
    render(<Login />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@x.com' } });
    fireEvent.change(screen.getByLabelText('Parol'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirish/i }));
    await waitFor(() => expect(screen.getByText('login.error')).toBeInTheDocument());
    expect(screen.queryByText(/to'xtatilgan/i)).not.toBeInTheDocument();
  });

  it('shows suspended-account message for 401 with ACCOUNT_NOT_ACTIVE code', async () => {
    // Suspended account: login() returns error = { code: 'ACCOUNT_NOT_ACTIVE', detail: '...' }
    // because createAuthContext sets error = err.response?.data?.error (the object from backend)
    // Pre-fix: this falls through to generic 'login.error' (no ACCOUNT_NOT_ACTIVE branch)
    // Post-fix: shows the specific suspended message
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: { code: 'ACCOUNT_NOT_ACTIVE', detail: 'Account is suspended' },
      status: 401,
    });
    render(<Login />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'suspended@x.com' } });
    fireEvent.change(screen.getByLabelText('Parol'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirish/i }));
    await waitFor(() =>
      expect(screen.getByText("Hisobingiz to'xtatilgan. Administrator bilan bog'laning.")).toBeInTheDocument()
    );
  });
});
