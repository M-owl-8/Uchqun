import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockSetUser = vi.fn();
let mockUser = { id: '1', mustChangePassword: true };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, setUser: mockSetUser }),
}));

const mockApiPut = vi.fn();
vi.mock('../../services/api', () => ({
  default: { put: (...args) => mockApiPut(...args) },
}));

import ChangePassword from '../../pages/ChangePassword';

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: '1', mustChangePassword: true };
});

describe('ChangePassword (CP-023)', () => {
  it('renders all three password fields', () => {
    render(<ChangePassword />);
    expect(screen.getAllByText('Change Password').length).toBeGreaterThan(0);
    expect(screen.getByText('Current Password')).toBeDefined();
    expect(screen.getByText('New Password')).toBeDefined();
    expect(screen.getByText('Confirm New Password')).toBeDefined();
  });

  it('shows mismatch error when new passwords differ', async () => {
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'OldPass@1' } });
    fireEvent.change(inputs[1], { target: { value: 'NewPass@1' } });
    fireEvent.change(inputs[2], { target: { value: 'Different@1' } });
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
    await waitFor(() => {
      expect(screen.getByText('New passwords do not match')).toBeDefined();
    });
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it('calls PUT /user/password and navigates to /reception on success', async () => {
    mockApiPut.mockResolvedValue({ data: {} });
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'OldPass@1' } });
    fireEvent.change(inputs[1], { target: { value: 'NewPass@1' } });
    fireEvent.change(inputs[2], { target: { value: 'NewPass@1' } });
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/user/password', {
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@1',
      });
      expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: false }));
      expect(mockNavigate).toHaveBeenCalledWith('/reception', { replace: true });
    });
  });

  it('shows incorrect-password error on 401', async () => {
    mockApiPut.mockRejectedValue({ response: { status: 401, data: {} } });
    render(<ChangePassword />);
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'WrongPass@1' } });
    fireEvent.change(inputs[1], { target: { value: 'NewPass@1' } });
    fireEvent.change(inputs[2], { target: { value: 'NewPass@1' } });
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeDefined();
    });
  });
});
