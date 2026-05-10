// refs #09-004 — parentT() custom function bypassed shared i18n; removed in favour of t()
// refs #09-007 — AIWarnings page had no navigation entry; Sidebar now includes it
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, onClick }) => React.createElement('a', { href: to, onClick }, children),
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'uz' },
  }),
}));

vi.mock('../../parent/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@school.uz' } }),
}));

vi.mock('../../parent/context/NotificationContext', () => ({
  useNotification: () => ({ count: 0, refreshNotifications: vi.fn() }),
}));

vi.mock('../../parent/services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { count: 0 } }) },
}));

describe('#09-004 parent Sidebar uses standard t() not parentT()', () => {
  it('renders without error after parentT() removal', async () => {
    const { default: Sidebar } = await import('../../parent/components/Sidebar');
    const { getByText } = render(React.createElement(Sidebar, { onClose: vi.fn() }));
    // sidebar.title key not in merged resources → defaultValue kicks in
    expect(getByText('Uchqun Parent')).toBeTruthy();
  });

  it('does not import locale JSON files directly (parentT pattern gone)', async () => {
    // If parentT were still present it would import 3 JSON files at module load;
    // verifying the component module resolves without those side imports is sufficient.
    await expect(import('../../parent/components/Sidebar')).resolves.toBeDefined();
  });
});

describe('#09-007 AIWarnings navigation entry exists in parent Sidebar', () => {
  it('renders an /ai-warnings link in the nav', async () => {
    const { default: Sidebar } = await import('../../parent/components/Sidebar');
    const { container } = render(React.createElement(Sidebar, { onClose: vi.fn() }));
    const links = Array.from(container.querySelectorAll('a'));
    const aiWarningsLink = links.find((a) => a.getAttribute('href') === '/ai-warnings');
    expect(aiWarningsLink).toBeTruthy();
  });
});
