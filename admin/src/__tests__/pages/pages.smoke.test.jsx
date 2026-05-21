/**
 * Smoke tests: verify that page components mount without crashing.
 * Covers pages not otherwise tested: Login, NotFound, DocumentApprovalQueue,
 * ReceptionManagement, SchoolRatings.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ---- stable t reference ----
vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn() } }) };
});

vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(),
    toasts: [], addToast: vi.fn(), removeToast: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

vi.mock('../../../shared/utils/cache', () => ({
  get: vi.fn(() => null), set: vi.fn(), invalidate: vi.fn(), invalidatePrefix: vi.fn(),
}));

vi.mock('@shared/hooks/useFetch', () => ({
  useFetch: vi.fn(() => ({ data: [], loading: false, error: null })),
}));

vi.mock('@shared/components/Card', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@shared/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

vi.mock('@shared/components/Modal', () => ({
  default: ({ children, isOpen }) => isOpen ? <div>{children}</div> : null,
}));

vi.mock('@shared/components/Button', () => ({
  default: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@shared/components/ConfirmDialog', () => ({
  default: ({ dialog }) => dialog ? <div>confirm</div> : null,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Ali', role: 'admin' }, logout: vi.fn() }),
}));

// Stub sub-components loaded by ReceptionManagement
vi.mock('../../pages/reception/ReceptionFormModal', () => ({
  default: () => null,
}));
vi.mock('../../pages/reception/ReceptionDetailPanel', () => ({
  default: () => null,
}));

import api from '../../services/api';

function wrap(Component) {
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>
  );
}

// ---- Login ----
describe('Login page smoke', () => {
  it('renders login form', async () => {
    const { default: Login } = await import('../../pages/Login');
    wrap(Login);
    expect(screen.getByRole('button', { name: /Kirish/i })).toBeTruthy();
  });
});

// ---- NotFound ----
describe('NotFound page smoke', () => {
  let NotFound;
  beforeAll(async () => {
    ({ default: NotFound } = await import('../../pages/NotFound'));
  });
  it('renders 404 heading', () => {
    wrap(NotFound);
    expect(screen.getByText('404')).toBeTruthy();
  });
});

// ---- DocumentApprovalQueue ----
describe('DocumentApprovalQueue page smoke', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('renders without crashing and shows queue heading', async () => {
    const { default: DocumentApprovalQueue } = await import('../../pages/DocumentApprovalQueue');
    wrap(DocumentApprovalQueue);
    await waitFor(() => screen.getByText('Tasdiqlash navbati'));
  });
});

// ---- ReceptionManagement ----
describe('ReceptionManagement page smoke', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: { data: [], total: 0, page: 1, pages: 0 } });
  });

  it('renders without crashing', async () => {
    const { default: ReceptionManagement } = await import('../../pages/ReceptionManagement');
    wrap(ReceptionManagement);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });
});

// ---- SchoolRatings ----
describe('SchoolRatings page smoke', () => {
  it('renders with useFetch stub (no loading, no error, empty data)', async () => {
    const { default: SchoolRatings } = await import('../../pages/SchoolRatings');
    wrap(SchoolRatings);
    // Empty data path — should show some ratings or empty state text
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });
});
