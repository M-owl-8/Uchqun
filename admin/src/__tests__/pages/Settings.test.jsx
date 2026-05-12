import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---- stable mock handles ----
const mockSuccess = vi.fn();
const mockToastError = vi.fn();
const mockLogout = vi.fn();
const mockSetUser = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/ToastContext', () => ({
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
    setUser: mockSetUser,
    logout: mockLogout,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock LanguageSwitcher to avoid its ../i18n import
vi.mock('../../components/LanguageSwitcher', () => ({
  default: () => React.createElement('div', { 'data-testid': 'lang-switcher' }),
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
    expect(screen.getByText('settings.language')).toBeTruthy();
    expect(screen.getByText('settings.changePassword')).toBeTruthy();
    expect(screen.getByText('settings.contactGovernment')).toBeTruthy();
  });

  it('shows loading state before profile resolves', async () => {
    let resolveMe;
    const api = (await import('../../services/api')).default;
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') return new Promise((r) => { resolveMe = r; });
      return Promise.resolve({ data: { data: [] } });
    });
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    // Page heading not yet rendered
    expect(screen.queryByText('settings.title')).toBeNull();
    // Unblock the pending promise
    resolveMe({ data: profile });
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
    fireEvent.change(pwdInputs[1], { target: { value: 'newpass123' } });
    fireEvent.change(pwdInputs[2], { target: { value: 'newpass123' } });

    const passwordForm = container.querySelectorAll('form')[2];
    fireEvent.submit(passwordForm);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/user/password', {
        currentPassword: 'current123',
        newPassword: 'newpass123',
      });
    });
  });

  it('opens compose modal when send message button clicked', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.sendMessage')).toBeTruthy());

    fireEvent.click(screen.getByText('settings.sendMessage').closest('button'));

    expect(screen.getByText('settings.sendToGovernment')).toBeTruthy();
  });

  it('shows my messages button when messages exist and opens history modal', async () => {
    const messages = [{
      id: 1,
      subject: 'Maktab muammosi',
      message: 'Body text',
      reply: null,
      createdAt: new Date().toISOString(),
    }];
    const api = (await import('../../services/api')).default;
    stubLoad(api, messages);
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.myMessages')).toBeTruthy());

    fireEvent.click(screen.getByText('settings.myMessages').closest('button'));

    expect(screen.getByText('Maktab muammosi')).toBeTruthy();
  });

  it('calls POST /admin/message-to-government when message is sent', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    api.post.mockResolvedValue({});
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.sendMessage')).toBeTruthy());

    fireEvent.click(screen.getByText('settings.sendMessage').closest('button'));

    const subjectInput = container.querySelector('input[placeholder="settings.subjectPlaceholder"]');
    const textarea = container.querySelector('textarea');
    fireEvent.change(subjectInput, { target: { value: 'Test subject' } });
    fireEvent.change(textarea, { target: { value: 'Test message body' } });

    fireEvent.click(screen.getByText('settings.send').closest('button'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/admin/message-to-government', {
        subject: 'Test subject',
        message: 'Test message body',
      });
    });
  });

  it('shows error toast when profile load fails', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockRejectedValue(new Error('network error'));
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
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
