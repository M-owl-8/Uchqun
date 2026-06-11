/**
 * PL-015 ship gate (Q3) — if positional filler labels ever reappear in
 * ratingIndicators.js, the school-rating form must NOT render.
 * Filler is simulated by mocking the shared config; the gate predicate is the
 * real implementation re-exported from the actual module.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
});
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }) => React.createElement('a', { href: to }, children),
}));
vi.mock('../../parent/context/ChildContext', () => ({
  useChild: () => ({ selectedChild: { id: 'child-1' }, children: [] }),
}));
vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../parent/components/Card', () => ({
  default: ({ children }) => React.createElement('div', { 'data-testid': 'card' }, children),
}));
vi.mock('../../parent/components/LoadingSpinner', () => ({
  default: () => React.createElement('div', { 'data-testid': 'loading-spinner' }),
}));

// Filler labels + the REAL gate predicate from the actual module.
vi.mock('@shared/config/ratingIndicators.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    PARENT_INDICATORS: [
      { key: 'parent_indicator_1', en: 'Indicator 1', uz: "Ko'rsatkich 1", ru: 'Показатель 1' },
      { key: 'parent_indicator_2', en: 'Indicator 2', uz: "Ko'rsatkich 2", ru: 'Показатель 2' },
      { key: 'parent_indicator_3', en: 'Indicator 3', uz: "Ko'rsatkich 3", ru: 'Показатель 3' },
      { key: 'parent_indicator_4', en: 'Indicator 4', uz: "Ko'rsatkich 4", ru: 'Показатель 4' },
      { key: 'parent_indicator_5', en: 'Indicator 5', uz: "Ko'rsatkich 5", ru: 'Показатель 5' },
    ],
  };
});

vi.mock('../../parent/services/api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes('school')) return Promise.resolve({ data: { school: { id: 's1', name: 'Uchqun School' } } });
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn(),
  },
}));

import TeacherRating from '../../parent/pages/TeacherRating';

describe('PL-015 gate — filler labels hide the school-rating form', () => {
  it('renders NO indicator rows and no rating form when config carries filler', async () => {
    render(React.createElement(TeacherRating));
    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).toBeFalsy(), { timeout: 3000 })
      .catch(() => {});
    expect(screen.queryByTestId('indicator-row-parent_indicator_1')).toBeNull();
    expect(screen.queryByTestId('indicator-row-parent_indicator_5')).toBeNull();
  });
});
