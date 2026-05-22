import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('react-i18next', () => {
  const t = (k, o) => o?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import api from '../../services/api';
import Trash from '../../pages/Trash';

const DELETED_PARENTS = [
  { id: 'u-1', firstName: 'Zulfiya', lastName: 'Nazarova', email: 'zulfiya@test.com', deletedAt: '2026-05-01T10:00:00Z' },
  { id: 'u-2', firstName: 'Bobur', lastName: 'Yusupov', email: 'bobur@test.com', deletedAt: '2026-05-02T10:00:00Z' },
];

const DELETED_RECEPTIONS = [
  { id: 'r-1', firstName: 'Malika', lastName: 'Tosheva', email: 'malika@test.com', deletedAt: '2026-05-03T10:00:00Z' },
];

describe('Trash (FE-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders deleted parents list in the default tab', async () => {
    api.get.mockResolvedValue({ data: { data: DELETED_PARENTS } });

    render(<MemoryRouter><Trash /></MemoryRouter>);
    await waitFor(() => screen.getByText('Zulfiya Nazarova'));
    expect(screen.getByText('Zulfiya Nazarova')).toBeTruthy();
    expect(screen.getByText('Bobur Yusupov')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/admin/parents'));
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('include_deleted=true'));
  });

  it('clicking Receptions tab fetches and renders deleted receptions', async () => {
    api.get
      .mockResolvedValueOnce({ data: { data: DELETED_PARENTS } })
      .mockResolvedValueOnce({ data: { data: DELETED_RECEPTIONS } });

    render(<MemoryRouter><Trash /></MemoryRouter>);
    await waitFor(() => screen.getByText('Zulfiya Nazarova'));

    const receptionsTab = screen.getByText('Receptions');
    fireEvent.click(receptionsTab);

    await waitFor(() => screen.getByText('Malika Tosheva'));
    expect(screen.getByText('Malika Tosheva')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/admin/receptions'));
  });

  it('Restore button calls PUT /admin/users/:id/restore and removes row on success', async () => {
    api.get.mockResolvedValue({ data: { data: DELETED_PARENTS } });
    api.put.mockResolvedValue({ data: { success: true } });

    render(<MemoryRouter><Trash /></MemoryRouter>);
    await waitFor(() => screen.getByText('Zulfiya Nazarova'));

    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/admin/users/u-1/restore');
    });
    await waitFor(() => {
      expect(screen.queryByText('Zulfiya Nazarova')).toBeNull();
    });
    expect(screen.getByText('Bobur Yusupov')).toBeTruthy();
  });

  it('handles 400 RESTORE_NOT_DELETED — shows error but does not remove row', async () => {
    api.get.mockResolvedValue({ data: { data: DELETED_PARENTS } });
    api.put.mockRejectedValue({
      response: { status: 400, data: { success: false, error: { code: 'RESTORE_NOT_DELETED' } } },
    });

    render(<MemoryRouter><Trash /></MemoryRouter>);
    await waitFor(() => screen.getByText('Zulfiya Nazarova'));

    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/admin/users/u-1/restore');
    });
    expect(screen.getByText('Zulfiya Nazarova')).toBeTruthy();
  });

  it('shows empty state when no deleted records', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });

    render(<MemoryRouter><Trash /></MemoryRouter>);
    await waitFor(() => screen.getByText('No deleted records'));
    expect(screen.getByText('No deleted records')).toBeTruthy();
  });
});
