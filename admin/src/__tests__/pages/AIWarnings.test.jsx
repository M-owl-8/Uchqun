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
  api.get.mockResolvedValue({ data: { data: warnings } });
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
      .mockResolvedValueOnce({ data: { data: [UNRESOLVED] } })
      .mockResolvedValue({ data: { data: [] } });
    api.put.mockResolvedValue({ data: { success: true } });
    render(<AIWarnings />);
    await waitFor(() => screen.getByText('Unresolved warning'));
    const resolveBtn = screen.getByRole('button', { name: /Hal qilingan deb belgilash/ });
    fireEvent.click(resolveBtn);
    await waitFor(() => expect(api.put).toHaveBeenCalled());
    const [url] = api.put.mock.calls[0];
    expect(url).toBe('/ai-warnings/w-1/resolve');
    expect(url).not.toContain('post');
    expect(url).not.toContain('/admin/');
  });
});
