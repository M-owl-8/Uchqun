/**
 * ChangePassword.jsx — force-change-password flow
 *
 * Tests the force-change UX component:
 *   - Wrong currentPassword → backend returns 400 → error shown, session preserved
 *   - Successful change → navigate to dashboard
 *   - Client-side validation (mismatch, too short, weak)
 *   - 5xx errors → generic error shown
 *
 * Root cause fixed: backend used to return 401 for wrong currentPassword.
 * The Axios interceptor treated all 401s as token-expiry events → tried refresh
 * → retried PUT → clearAuth() → session destroyed → no error shown to user.
 * Fix: backend returns 400. Interceptor passes 400 straight to catch block.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPut = vi.fn();
vi.mock('../services/api', () => ({ default: { put: mockPut } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

const mockSetUser = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', mustChangePassword: true }, setUser: mockSetUser }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts?.defaultValue || key,
  }),
}));

const ChangePassword = (await import('../pages/ChangePassword.jsx')).default;

describe('ChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 3 password fields and a submit button', () => {
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    expect(inputs).toHaveLength(3);
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('shows mismatch error when passwords do not match (client-side)', async () => {
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'TempPass@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'NewPass@2026' } });
    fireEvent.change(inputs[2], { target: { value: 'Different@2026' } });
    fireEvent.submit(inputs[0].closest('form'));
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('shows too-short error when newPassword < 8 chars (client-side)', async () => {
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'TempPass@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'abc' } });
    fireEvent.change(inputs[2], { target: { value: 'abc' } });
    fireEvent.submit(inputs[0].closest('form'));
    await waitFor(() => {
      expect(screen.getByText(/8 characters/i)).toBeInTheDocument();
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('on 400 — shows "Current password is incorrect", session preserved (does NOT navigate)', async () => {
    mockPut.mockRejectedValueOnce({ response: { status: 400, data: { error: 'CURRENT_PASSWORD_INCORRECT' } } });
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'WrongPass@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'NewPass@2026' } });
    fireEvent.change(inputs[2], { target: { value: 'NewPass@2026' } });
    fireEvent.submit(inputs[0].closest('form'));
    await waitFor(() => {
      expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('on 5xx — shows generic error, session preserved', async () => {
    mockPut.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'TempPass@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'NewPass@2026' } });
    fireEvent.change(inputs[2], { target: { value: 'NewPass@2026' } });
    fireEvent.submit(inputs[0].closest('form'));
    await waitFor(() => {
      expect(screen.getByText(/failed to change password/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('on 200 — clears mustChangePassword flag and navigates to dashboard', async () => {
    mockPut.mockResolvedValueOnce({ data: { success: true } });
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'TempPass@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'NewPass@2026' } });
    fireEvent.change(inputs[2], { target: { value: 'NewPass@2026' } });
    fireEvent.submit(inputs[0].closest('form'));
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: false }));
      expect(mockNavigate).toHaveBeenCalledWith('/government', { replace: true });
    });
  });

  it('submits PUT /user/password with currentPassword + newPassword (no confirmPassword in body)', async () => {
    mockPut.mockResolvedValueOnce({ data: { success: true } });
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'TempPass@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'NewPass@2026' } });
    fireEvent.change(inputs[2], { target: { value: 'NewPass@2026' } });
    fireEvent.submit(inputs[0].closest('form'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/user/password', {
        currentPassword: 'TempPass@2026',
        newPassword: 'NewPass@2026',
      });
    });
    // confirmPassword must NOT be in the request body
    const body = mockPut.mock.calls[0][1];
    expect(body).not.toHaveProperty('confirmPassword');
  });
});
