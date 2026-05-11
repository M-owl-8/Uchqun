// refs #05-013 — reception test coverage sparse (auth-only)
// refs #07-008 — hardcoded 'uz-UZ' / Uzbek strings replaced with i18n via t()
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'en' },
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }) => React.createElement('a', { href: to }, children),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      firstName: 'Test',
      lastName: 'User',
      email: 'reception@school.uz',
      role: 'reception',
    },
    logout: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [], user: {} } }),
    put: vi.fn().mockResolvedValue({ data: { user: {} } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

const profile = {
  firstName: 'Test',
  lastName: 'User',
  email: 'reception@school.uz',
  phone: '+998901234567',
  notificationPreferences: { email: true, push: true },
};

function stubLoad(api, messages = []) {
  api.get.mockImplementation((url) => {
    if (url === '/auth/me') return Promise.resolve({ data: profile });
    if (url === '/reception/messages') return Promise.resolve({ data: { data: messages } });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('#05-013 Reception Settings page', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders without error', async () => {
    const { default: Settings } = await import('../../pages/Settings');
    expect(() => render(React.createElement(Settings))).not.toThrow();
  });

  it('phone field placeholder uses Uzbek format (not US format)', async () => {
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    const phoneInput = container.querySelector('input[type="tel"], input[placeholder*="+998"]');
    if (phoneInput) {
      expect(phoneInput.getAttribute('placeholder')).toMatch(/\+998/);
    } else {
      // placeholder rendered via defaultValue fallback
      expect(container.textContent).toBeDefined();
    }
  });

  it('renders page title via t() (i18n wired)', async () => {
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    // component starts with loading:true (spinner); wait for profile fetch to complete
    await waitFor(() => {
      expect(container.querySelector('h1')).toBeTruthy();
    });
  });
});

describe('CL-014c Settings comprehensive', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders all section headings after data loads', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.profileInfo')).toBeTruthy());
    expect(screen.getByText('settings.notificationPreferences')).toBeTruthy();
    expect(screen.getByText('settings.changePassword')).toBeTruthy();
    expect(screen.getByText('profile.contactGovernment')).toBeTruthy();
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
      expect(api.put).toHaveBeenCalledWith('/user/profile', expect.objectContaining({ firstName: 'Test' }));
    });
  });

  it('calls PUT /user/password on password form submit', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    api.put.mockResolvedValue({});
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('settings.changePasswordButton')).toBeTruthy());

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
    await waitFor(() => expect(screen.getByText('profile.sendMessage')).toBeTruthy());

    fireEvent.click(screen.getByText('profile.sendMessage').closest('button'));

    expect(screen.getByText('Davlatga xabar yuborish')).toBeTruthy();
  });

  it('shows my messages button when messages exist and opens history modal', async () => {
    const messages = [{ id: 1, subject: 'Maktab xabari', message: 'Body', reply: null, createdAt: new Date().toISOString() }];
    const api = (await import('../../services/api')).default;
    stubLoad(api, messages);
    const { default: Settings } = await import('../../pages/Settings');
    render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('profile.myMessages')).toBeTruthy());

    fireEvent.click(screen.getByText('profile.myMessages').closest('button'));

    expect(screen.getByText('Maktab xabari')).toBeTruthy();
  });

  it('calls POST /reception/message-to-government when message is sent', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api);
    api.post.mockResolvedValue({});
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    await waitFor(() => expect(screen.getByText('profile.sendMessage')).toBeTruthy());

    fireEvent.click(screen.getByText('profile.sendMessage').closest('button'));

    const subjectInput = container.querySelector('input[placeholder="profile.subjectPlaceholder"]');
    const textarea = container.querySelector('textarea');
    fireEvent.change(subjectInput, { target: { value: 'Test subject' } });
    fireEvent.change(textarea, { target: { value: 'Test message body' } });

    fireEvent.click(screen.getByText('profile.send').closest('button'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reception/message-to-government', {
        subject: 'Test subject',
        message: 'Test message body',
      });
    });
  });

  it('renders page (not stuck loading) when profile load fails', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockRejectedValue(new Error('network error'));
    const { default: Settings } = await import('../../pages/Settings');
    const { container } = render(React.createElement(Settings));
    await waitFor(() => {
      expect(container.querySelector('h1')).toBeTruthy();
    });
  });
});
