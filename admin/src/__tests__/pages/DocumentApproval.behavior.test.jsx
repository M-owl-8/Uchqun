/**
 * Behavioral tests for DocumentApprovalQueue — approve and reject endpoint assertions.
 * These cover the highest-value workflows (approve/reject actions) that the smoke
 * test does not verify.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));
vi.mock('react-i18next', () => {
  const t = (k, o) => o?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../../shared/utils/cache', () => ({
  get: vi.fn(() => null), set: vi.fn(), invalidate: vi.fn(), invalidatePrefix: vi.fn(),
}));
vi.mock('@shared/components/Button', () => ({
  default: ({ children, onClick, disabled, loading }) => (
    <button onClick={onClick} disabled={disabled || loading}>{children}</button>
  ),
}));
vi.mock('@shared/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));
vi.mock('@shared/components/Modal', () => ({
  default: ({ isOpen, children, footer }) =>
    isOpen ? <div role="dialog">{children}{footer}</div> : null,
}));

import api from '../../services/api';
import DocumentApprovalQueue from '../../pages/DocumentApprovalQueue';

const DOC = {
  id: 'doc-1',
  documentType: 'Diploma',
  status: 'pending',
  daysOld: 1,
  createdAt: new Date().toISOString(),
  reception: { firstName: 'Malika', lastName: 'Tosheva' },
  fileUrl: null,
};

const mkGet = (pending = [DOC]) =>
  api.get.mockImplementation((url) => {
    if (url.includes('/pending')) return Promise.resolve({ data: { data: pending } });
    return Promise.resolve({ data: { data: [] } });
  });

describe('DocumentApprovalQueue behavioral (FE residual)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approve: calls PUT /admin/documents/:id/approve on Tasdiqlash click', async () => {
    mkGet();
    api.put.mockResolvedValue({ data: { success: true } });

    render(<MemoryRouter><DocumentApprovalQueue /></MemoryRouter>);
    await waitFor(() => screen.getByText('Tasdiqlash'));

    fireEvent.click(screen.getByText('Tasdiqlash'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/admin/documents/doc-1/approve');
    });
  });

  it('approve: removes doc from pending list on success', async () => {
    mkGet();
    api.put.mockResolvedValue({ data: { success: true } });

    render(<MemoryRouter><DocumentApprovalQueue /></MemoryRouter>);
    await waitFor(() => screen.getByText('Tasdiqlash'));
    fireEvent.click(screen.getByText('Tasdiqlash'));

    await waitFor(() => {
      expect(screen.queryByText('Tasdiqlash')).toBeNull();
    });
  });

  it('reject: calls PUT /admin/documents/:id/reject with reason after modal submit', async () => {
    mkGet();
    api.put.mockResolvedValue({ data: { success: true } });

    render(<MemoryRouter><DocumentApprovalQueue /></MemoryRouter>);
    await waitFor(() => screen.getByText('Tasdiqlash'));

    fireEvent.click(screen.getByRole('button', { name: 'Rad etish' }));
    await waitFor(() => screen.getByRole('dialog'));

    const textarea = screen.getByPlaceholderText(/qaytadan yuklang/i);
    fireEvent.change(textarea, { target: { value: 'Hujjat sifati past' } });

    fireEvent.click(screen.getByText('Rad etish', { selector: 'button' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/admin/documents/doc-1/reject',
        { reason: 'Hujjat sifati past' },
      );
    });
  });
});
