import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockToastError = vi.fn();
const mockSuccess = vi.fn();

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

vi.mock('react-i18next', () => {
  const t = (_k, opts) => opts?.defaultValue ?? _k;
  return { useTranslation: () => ({ t }) };
});

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../../shared/utils/cache', () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { schoolId: 'school-uuid-1' } }),
}));

vi.mock('@shared/components/ConfirmDialog', () => ({
  default: ({ dialog, onCancel }) => dialog ? (
    <div data-testid="confirm-dialog">
      <button data-testid="confirm-ok" onClick={() => dialog.onConfirm()}>OK</button>
      <button data-testid="confirm-cancel" onClick={onCancel}>Cancel</button>
    </div>
  ) : null,
}));

import api from '../../services/api';
import AIWarnings from '../../pages/AIWarnings';

const UNRESOLVED = {
  id: 'w-1',
  title: 'Unresolved warning',
  severity: 'high',
  resolvedAt: null,
  category: 'attendance',
};

const RESOLVED = {
  id: 'w-2',
  title: 'Resolved warning',
  severity: 'low',
  resolvedAt: '2026-05-20T10:00:00.000Z',
  resolvedBy: 'Admin User',
};

function stubLoad(warnings) {
  api.get.mockResolvedValue({ data: { data: { warnings, total: warnings.length } } });
}

describe('AIWarnings page (AD-001, AD-002, AD-009, AD-013)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /ai-warnings — not /admin/ai-warnings (revert-guard: AD-001)', async () => {
    stubLoad([UNRESOLVED]);
    render(<AIWarnings />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const [url] = api.get.mock.calls[0];
    expect(url).toBe('/ai-warnings');
    expect(url).not.toContain('/admin/ai-warnings');
  });

  it('shows unresolved warning card (resolvedAt: null)', async () => {
    stubLoad([UNRESOLVED]);
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));
    expect(screen.queryByText('Hal qilingan')).toBeNull();
  });

  it('shows resolved warning card as struck-through (resolvedAt: timestamp)', async () => {
    stubLoad([RESOLVED]);
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Resolved warning'));
    // resolved card has line-through styling — verify resolved badge is shown
    expect(screen.getByText('Hal qilingan')).toBeTruthy();
    // resolved card shows resolver name
    expect(screen.getByText('Admin User')).toBeTruthy();
  });

  it('counts only unresolved warnings in the total header (AD-009: resolvedAt not isResolved)', async () => {
    stubLoad([UNRESOLVED, RESOLVED]);
    render(<AIWarnings />);
    // Header: "AI ogohlantirishlar · 2" (total), filter shows "Hal qilinmagan · 1"
    await waitFor(() => screen.getByText('Unresolved warning'));
    // both cards render
    expect(screen.getByText('Resolved warning')).toBeTruthy();
    // filter option shows counts derived from resolvedAt
    const unresolvedOption = screen.getByRole('option', { name: /Hal qilinmagan.*1/ });
    expect(unresolvedOption).toBeTruthy();
  });

  it('shows error toast on load failure — no silent swallow (AD-002)', async () => {
    api.get.mockRejectedValue({ response: { data: { error: 'Server error' } } });
    render(<AIWarnings />);
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Server error'));
    // must NOT show empty-state as success
    expect(screen.queryByText('Ogohlantirish yo\'q')).toBeNull();
  });

  it('fetches exactly once on mount — stable showError ref prevents refetch loop', async () => {
    stubLoad([UNRESOLVED]);
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));
    expect(api.get.mock.calls.length).toBe(1);
  });

  it('calls PUT /ai-warnings/:id/resolve — not POST /admin (AD-013)', async () => {
    // first GET returns the warning; second GET (after resolve) returns empty
    api.get
      .mockResolvedValueOnce({ data: { data: { warnings: [UNRESOLVED], total: 1 } } })
      .mockResolvedValue({ data: { data: { warnings: [], total: 0 } } });
    api.put.mockResolvedValue({ data: { success: true } });
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));
    const resolveBtn = screen.getByRole('button', { name: /Hal qilingan deb belgilash/ });
    fireEvent.click(resolveBtn);
    // handleResolve opens a ConfirmDialog — must confirm before api.put is called
    const confirmBtn = await screen.findByTestId('confirm-ok');
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(api.put).toHaveBeenCalled());
    const [url] = api.put.mock.calls[0];
    expect(url).toBe('/ai-warnings/w-1/resolve');
    expect(url).not.toContain('post');
    expect(url).not.toContain('/admin/');
  });
});

describe('AIWarnings analyze + notify (FE-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: { warnings: [UNRESOLVED], total: 1 } } });
    api.post = vi.fn().mockResolvedValue({ data: { success: true } });
  });

  it('analyze button triggers POST /ai-warnings/analyze with schoolId', async () => {
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));

    const analyzeBtn = screen.getByRole('button', { name: /Tahlil qilish/ });
    fireEvent.click(analyzeBtn);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/ai-warnings/analyze',
      { schoolId: 'school-uuid-1' }
    ));
  });

  it('warning list refreshes after analyze', async () => {
    api.get
      .mockResolvedValueOnce({ data: { data: { warnings: [UNRESOLVED], total: 1 } } })
      .mockResolvedValue({ data: { data: { warnings: [], total: 0 } } });

    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));

    fireEvent.click(screen.getByRole('button', { name: /Tahlil qilish/ }));

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('notify button shown on unresolved card', async () => {
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));
    expect(screen.getByRole('button', { name: /Xabar berish/ })).toBeTruthy();
  });

  it('notify confirm dialog shown before POST', async () => {
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));

    fireEvent.click(screen.getByRole('button', { name: /Xabar berish/ }));
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('POST /ai-warnings/:id/notify called on confirm', async () => {
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));

    fireEvent.click(screen.getByRole('button', { name: /Xabar berish/ }));
    await waitFor(() => screen.getByTestId('confirm-dialog'));

    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/ai-warnings/w-1/notify',
      { includeParents: true, includeTeachers: true }
    ));
  });
});

// Crash-guard tests — reproduce ADMIN-OGOHLANTIRISHLAR-CRASH (TypeError: e.filter is not a function)
// These tests fail against pre-fix code and pass after the res.data?.data?.warnings fix.
describe('AIWarnings crash guards (ADMIN-OGOHLANTIRISHLAR-CRASH)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no crash when API returns correct { warnings: [], total: 0 } shape', async () => {
    api.get.mockResolvedValue({ data: { data: { warnings: [], total: 0 } } });
    render(<AIWarnings />);
    await waitFor(() => screen.getByText("Ogohlantirish yo'q"));
  });

  it('no crash when API returns correct { warnings: [...] } shape', async () => {
    api.get.mockResolvedValue({
      data: { data: { warnings: [UNRESOLVED], total: 1 } },
    });
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));
  });

  it('no crash when API returns null body (edge case)', async () => {
    api.get.mockResolvedValue({ data: { data: null } });
    render(<AIWarnings />);
    await waitFor(() => screen.getByText("Ogohlantirish yo'q"));
  });

  it('no crash when API returns object without warnings key', async () => {
    // Root cause shape: { total: 0, limit: 10, offset: 0 } — no warnings field
    api.get.mockResolvedValue({ data: { data: { total: 0, limit: 10, offset: 0 } } });
    render(<AIWarnings />);
    await waitFor(() => screen.getByText("Ogohlantirish yo'q"));
  });

  it('no crash when data.data is undefined', async () => {
    api.get.mockResolvedValue({ data: {} });
    render(<AIWarnings />);
    await waitFor(() => screen.getByText("Ogohlantirish yo'q"));
  });
});
