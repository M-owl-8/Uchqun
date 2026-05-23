/**
 * Behavioral tests for ReceptionManagement — create and delete endpoint assertions.
 * The smoke test verifies mounting; these verify the CRUD API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
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
vi.mock('@shared/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));
vi.mock('@shared/components/Button', () => ({
  default: ({ children, onClick, disabled, loading, type }) => (
    <button type={type} onClick={onClick} disabled={disabled || loading}>{children}</button>
  ),
}));
// Mock ReceptionDetailPanel — not under test
vi.mock('../../pages/reception/ReceptionDetailPanel', () => ({
  default: () => null,
}));
// Mock ReceptionFormModal to render a minimal submittable form
vi.mock('../../pages/reception/ReceptionFormModal', () => ({
  default: ({ onSubmit, onClose, mode }) => (
    <form data-testid={`reception-form-${mode}`} onSubmit={onSubmit}>
      <button type="submit" data-testid="form-submit">Submit</button>
      <button type="button" onClick={onClose}>Close</button>
    </form>
  ),
}));

import api from '../../services/api';
import ReceptionManagement from '../../pages/ReceptionManagement';

const RECEPTION = {
  id: 'r-1',
  firstName: 'Malika',
  lastName: 'Tosheva',
  email: 'malika@test.com',
  phone: '+998901234567',
  role: 'reception',
  status: 'active',
  documentsApproved: true,
  isActive: true,
  createdAt: new Date().toISOString(),
  documents: [],
};

describe('ReceptionManagement behavioral (FE residual)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [RECEPTION], total: 1, page: 1, pages: 1 } });
  });

  it('create: calls POST /admin/receptions on form submit', async () => {
    api.post.mockResolvedValue({ data: { data: { ...RECEPTION, id: 'r-new' } } });

    render(<MemoryRouter><ReceptionManagement /></MemoryRouter>);
    await waitFor(() => screen.getByText('Malika Tosheva'));

    const createBtn = screen.getByText('receptionsPage.create');
    fireEvent.click(createBtn);

    await waitFor(() => screen.getByTestId('reception-form-create'));
    fireEvent.submit(screen.getByTestId('reception-form-create'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/admin/receptions',
        expect.any(Object),
      );
    });
  });

  it('delete: calls DELETE /admin/receptions/:id after confirm', async () => {
    api.delete.mockResolvedValue({ data: { success: true } });

    render(<MemoryRouter><ReceptionManagement /></MemoryRouter>);
    await waitFor(() => screen.getByText('Malika Tosheva'));

    const deleteBtn = screen.getByTitle("O'chirish");
    fireEvent.click(deleteBtn);

    await waitFor(() => screen.getByRole('dialog', { name: '' }));
    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/admin/receptions/r-1');
    });
  });
});
