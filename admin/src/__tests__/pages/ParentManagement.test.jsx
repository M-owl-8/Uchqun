import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    warning: vi.fn(),
    info: vi.fn(),
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

vi.mock('../../../shared/utils/cache', () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock('@shared/components/ConfirmDialog', () => ({
  default: ({ dialog, onCancel }) => dialog ? (
    <div data-testid="confirm-dialog">
      <button data-testid="confirm-ok" onClick={() => dialog.onConfirm()}>Confirm</button>
      <button data-testid="confirm-cancel" onClick={onCancel}>Cancel</button>
    </div>
  ) : null,
}));

vi.mock('@shared/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

vi.mock('../../../shared/components/Skeleton', () => ({
  SkeletonList: () => <div data-testid="skeleton" />,
}));

import api from '../../services/api';
import ParentManagement from '../../pages/ParentManagement';

const ACTIVE_PARENT = {
  id: 'p-1',
  firstName: 'Aziz',
  lastName: 'Karimov',
  email: 'aziz@example.com',
  phone: '+998901234567',
  status: 'active',
};

const SUSPENDED_PARENT = {
  id: 'p-2',
  firstName: 'Malika',
  lastName: 'Yusupova',
  email: 'malika@example.com',
  phone: '+998901234568',
  status: 'suspended',
};

const PARENT_DETAIL = { children: [], activities: [], meals: [], media: [] };

describe('ParentManagement (FE-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders parent list from API', async () => {
    api.get.mockResolvedValue({ data: { data: [ACTIVE_PARENT] } });
    render(<ParentManagement />);
    await waitFor(() => screen.getByText('Aziz Karimov'));
    expect(screen.getByText('aziz@example.com')).toBeTruthy();
  });

  it('shows active status dot for active parents', async () => {
    api.get.mockResolvedValue({ data: { data: [ACTIVE_PARENT] } });
    render(<ParentManagement />);
    await waitFor(() => screen.getByText('Aziz Karimov'));
    // Status is now a dot with title attribute, not a text badge
    expect(document.querySelector('[title="Faol"]')).toBeTruthy();
  });

  it('shows suspended status dot for suspended parents', async () => {
    api.get.mockResolvedValue({ data: { data: [SUSPENDED_PARENT] } });
    render(<ParentManagement />);
    await waitFor(() => screen.getByText('Malika Yusupova'));
    expect(document.querySelector('[title="To\'xtatilgan"]')).toBeTruthy();
  });

  it('Suspend button opens ConfirmDialog', async () => {
    api.get
      .mockResolvedValueOnce({ data: { data: [ACTIVE_PARENT] } })
      .mockResolvedValueOnce({ data: { data: PARENT_DETAIL } });

    render(<ParentManagement />);
    await waitFor(() => screen.getByText('Aziz Karimov'));

    fireEvent.click(screen.getByRole('button', { name: /Aziz Karimov/i }));
    await waitFor(() => screen.getByText("To'xtatish"));

    fireEvent.click(screen.getByText("To'xtatish"));
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
  });

  it('PUT .../suspend called on confirm', async () => {
    api.get
      .mockResolvedValueOnce({ data: { data: [ACTIVE_PARENT] } })
      .mockResolvedValueOnce({ data: { data: PARENT_DETAIL } });
    api.put.mockResolvedValue({ data: { data: { status: 'suspended' } } });

    render(<ParentManagement />);
    await waitFor(() => screen.getByText('Aziz Karimov'));

    fireEvent.click(screen.getByRole('button', { name: /Aziz Karimov/i }));
    await waitFor(() => screen.getByText("To'xtatish"));

    fireEvent.click(screen.getByText("To'xtatish"));
    await waitFor(() => screen.getByTestId('confirm-dialog'));

    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/parents/p-1/suspend'));
  });

  it('PUT not called when dialog cancelled', async () => {
    api.get
      .mockResolvedValueOnce({ data: { data: [ACTIVE_PARENT] } })
      .mockResolvedValueOnce({ data: { data: PARENT_DETAIL } });

    render(<ParentManagement />);
    await waitFor(() => screen.getByText('Aziz Karimov'));

    fireEvent.click(screen.getByRole('button', { name: /Aziz Karimov/i }));
    await waitFor(() => screen.getByText("To'xtatish"));

    fireEvent.click(screen.getByText("To'xtatish"));
    await waitFor(() => screen.getByTestId('confirm-dialog'));

    fireEvent.click(screen.getByTestId('confirm-cancel'));
    expect(api.put).not.toHaveBeenCalled();
  });
});
