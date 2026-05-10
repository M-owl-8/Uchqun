// refs #09-001 — Parent can see "Mark as Resolved" button that always returns 403
import { describe, it, expect, vi } from 'vitest';
import { render, findByText as domFindByText, queryByText as domQueryByText } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => opts?.defaultValue ?? k }),
}));

vi.mock('../../parent/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          warnings: [
            {
              id: '1',
              title: 'Test Warning',
              message: 'msg',
              severity: 'medium',
              warningType: 'other',
              isResolved: false,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    }),
  },
}));

vi.mock('../../parent/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', role: 'parent' } }),
}));

vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

vi.mock('../../parent/components/Card', () => ({
  default: ({ children }) => React.createElement('div', null, children),
}));

vi.mock('../../parent/components/LoadingSpinner', () => ({
  default: () => React.createElement('div', null, 'loading'),
}));

describe('#09-001 AIWarnings resolve button visibility', () => {
  it('hides Resolve button when logged-in user is parent role', async () => {
    const { default: AIWarnings } = await import('../../parent/pages/AIWarnings');
    const { container, findByText, queryByText } = render(
      React.createElement(AIWarnings)
    );

    // Wait for warning card to render
    await findByText('Test Warning');

    // Parent must NOT see the resolve button — endpoint requires admin/government
    expect(queryByText('Yechildi deb belgilash')).toBeNull();
  });
});
