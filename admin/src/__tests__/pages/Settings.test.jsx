import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---- stable mock handles ----
const mockSuccess = vi.fn();
const mockToastError = vi.fn();
const mockLogout = vi.fn();
const mockSetUser = vi.fn();
const mockNavigate = vi.fn();

const mockUser = {
  firstName: 'Ali',
  lastName: 'Valiyev',
  email: 'ali@school.uz',
  phone: '+998901234567',
  notificationPreferences: { email: true, push: true },
};

vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockToastError,
    warning: vi.fn(),
    info: vi.fn(),
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    setUser: mockSetUser,
    logout: mockLogout,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, className }) => React.createElement('a', { href: to, className }, children),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));


const profile = {
  firstName: 'Ali',
  lastName: 'Valiyev',
  email: 'ali@school.uz',
  phone: '+998901234567',
  notificationPreferences: { email: true, push: true },
};

function stubLoad(api, messages = []) {
  api.get.mockImplementation((url) => {
    if (url === '/auth/me') return Promise.resolve({ data: profile });
    if (url === '/admin/messages') return Promise.resolve({ data: { data: messages } });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('CL-014a Settings', () => {
  beforeEach(() => {
    mockSuccess.mockReset();
    mockToastError.mockReset();
    mockLogout.mockReset();
    mockSetUser.mockReset();
    mockNavigate.mockReset();
    vi.resetModules();
  });

  it('renders all section headings after data loads', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.title')).toBeTruthy());
    expect(screen.getByText('settings.profileInfo')).toBeTruthy();
    expect(screen.getByText('settings.notifications')).toBeTruthy();
    expect(screen.getByText('settings.changePassword')).toBeTruthy();
    // Contact Government section removed — functionality moved to Xabarlar page (/admin/messages)
    expect(screen.getByText('settings.quickLinks')).toBeTruthy();
  });

  it('renders title immediately since profile comes from auth context', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    // Profile is synchronous from auth context — no loading gate
    expect(screen.queryByText('settings.title')).toBeTruthy();
  });

  it('calls PUT /user/profile on save profile submit', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    api.put.mockResolvedValue({ data: profile });
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.saveProfile')).toBeTruthy());

    const profileForm = container.querySelectorAll('form')[0];
    fireEvent.submit(profileForm);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/user/profile',
        expect.objectContaining({ firstName: 'Ali', lastName: 'Valiyev' }),
      );
    });
  });

  it('calls PUT /user/password on password form submit', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    api.put.mockResolvedValue({});
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.updatePassword')).toBeTruthy());

    const pwdInputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(pwdInputs[0], { target: { value: 'current123' } });
    // password must pass strength check: lowercase + uppercase + digit (Settings.jsx:137)
    fireEvent.change(pwdInputs[1], { target: { value: 'newPass123' } });
    fireEvent.change(pwdInputs[2], { target: { value: 'newPass123' } });

    const passwordForm = container.querySelectorAll('form')[2];
    fireEvent.submit(passwordForm);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/user/password', {
        currentPassword: 'current123',
        newPassword: 'newPass123',
      });
    });
  });

  it('Xabarlar Quick Link navigates to /admin/messages', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.title')).toBeTruthy());
    // Contact Government section was removed and replaced by a Quick Link to /admin/messages
    const messagesLink = screen.getByText('nav.govMessages').closest('a');
    expect(messagesLink).toBeTruthy();
    expect(messagesLink.getAttribute('href')).toBe('/admin/messages');
  });

  it('shows error toast when profile save fails', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    api.put.mockRejectedValue({ response: { data: { error: 'Server error' } } });
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.saveProfile')).toBeTruthy());

    const profileForm = container.querySelectorAll('form')[0];
    fireEvent.submit(profileForm);

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });

  it('calls logout and navigates to /login when logout clicked', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('logout')).toBeTruthy());

    fireEvent.click(screen.getByText('logout').closest('button'));

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
