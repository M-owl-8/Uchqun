import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@shared/context/ToastContext', () => ({
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

// Stable t reference — prevents useCallback from invalidating on every render.
vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@shared/components/Card', () => ({
  default: ({ children, className }) => <div className={className}>{children}</div>,
}));

vi.mock('@shared/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

import api from '../../services/api';
import TherapyManagement from '../../pages/TherapyManagement';

const THERAPY = {
  id: 't-1',
  title: 'Music Session',
  description: 'Relaxation music',
  therapyType: 'music',
  duration: 30,
  ageGroup: 'all',
  difficultyLevel: 'beginner',
};

function stubLoad(therapies = [THERAPY]) {
  api.get.mockResolvedValue({ data: { data: therapies } });
}

describe('TherapyManagement page (U-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches therapies from GET /therapy on mount', async () => {
    stubLoad();
    render(<TherapyManagement />);
    await waitFor(() => screen.getByText('Music Session'));
    expect(api.get).toHaveBeenCalled();
    expect(api.get.mock.calls[0][0]).toBe('/therapy');
  });

  it('shows ConfirmDialog when delete button clicked — not native confirm()', async () => {
    stubLoad();
    render(<TherapyManagement />);
    await waitFor(() => screen.getByText('Music Session'));
    // Find the error-styled (delete) button
    const trashBtn = screen.getAllByRole('button').find(b =>
      b.className?.includes('error')
    );
    fireEvent.click(trashBtn);
    await waitFor(() =>
      expect(screen.getByText("Terapiyani o'chirishni tasdiqlaysizmi?")).toBeTruthy()
    );
  });

  it('calls DELETE /therapy/:id on ConfirmDialog confirm', async () => {
    stubLoad();
    api.delete.mockResolvedValue({});
    // after delete, re-fetch returns empty
    api.get
      .mockResolvedValueOnce({ data: { data: [THERAPY] } })
      .mockResolvedValue({ data: { data: [] } });
    render(<TherapyManagement />);
    await waitFor(() => screen.getByText('Music Session'));
    const trashBtn = screen.getAllByRole('button').find(b =>
      b.className?.includes('error')
    );
    fireEvent.click(trashBtn);
    await waitFor(() => screen.getByText("Terapiyani o'chirishni tasdiqlaysizmi?"));
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/therapy/t-1'));
  });

  it('does NOT call DELETE when cancel clicked in ConfirmDialog', async () => {
    stubLoad();
    render(<TherapyManagement />);
    await waitFor(() => screen.getByText('Music Session'));
    const trashBtn = screen.getAllByRole('button').find(b =>
      b.className?.includes('error')
    );
    fireEvent.click(trashBtn);
    await waitFor(() => screen.getByText("Terapiyani o'chirishni tasdiqlaysizmi?"));
    const cancelBtn = screen.getByRole('button', { name: /Bekor|Cancel/i });
    fireEvent.click(cancelBtn);
    expect(api.delete).not.toHaveBeenCalled();
  });
});
