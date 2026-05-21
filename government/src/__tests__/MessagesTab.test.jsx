import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock('../services/api', () => ({ default: mockApi }));

vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => opts?.defaultValue ?? key }),
}));
vi.mock('@shared/components/Card', () => ({
  default: ({ children, className }) => <div className={className}>{children}</div>,
}));
vi.mock('@shared/components/Button', () => ({
  default: ({ children, onClick, loading, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{loading ? '...' : children}</button>
  ),
}));
vi.mock('@shared/components/LoadingSpinner', () => ({ default: () => <span>loading</span> }));
vi.mock('@shared/components/ConfirmDialog', () => ({
  default: ({ dialog, onCancel }) =>
    dialog ? (
      <div data-testid="confirm-dialog">
        <span>{dialog.message}</span>
        <button onClick={dialog.onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

const MessagesTab = (await import('../components/tabs/MessagesTab.jsx')).default;

const mkMsg = (id, isRead = false) => ({
  id,
  subject: `Subject ${id}`,
  message: `Message ${id}`,
  isRead,
  sender: { firstName: 'Test', lastName: 'User', role: 'parent' },
  createdAt: new Date().toISOString(),
  replies: [],
});

describe('MessagesTab — GOV-006: unread count stale closure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GOV-006: onUnreadCountChange reports total unread count after load-more, not just new page', async () => {
    const page1 = [mkMsg(1, false), mkMsg(2, true)]; // 1 unread
    const page2 = [mkMsg(3, false)];                 // 1 unread → total should be 2

    mockApi.get
      .mockResolvedValueOnce({
        data: { data: page1, pagination: { total: 3, page: 1, limit: 2, totalPages: 2 } },
      })
      .mockResolvedValueOnce({
        data: { data: page2, pagination: { total: 3, page: 2, limit: 2, totalPages: 2 } },
      });

    const onUnreadCountChange = vi.fn();
    render(<MessagesTab onUnreadCountChange={onUnreadCountChange} />);

    await waitFor(() => expect(screen.getByText('Subject 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Ko.proq yuklash/i }));

    await waitFor(() => expect(screen.getByText('Subject 3')).toBeInTheDocument());

    // Stale closure bug: would report 1 (only page-2 unread) instead of 2 (total unread)
    expect(onUnreadCountChange).toHaveBeenLastCalledWith(2);
  });
});

describe('MessagesTab — GOV-008: delete uses ConfirmDialog instead of window.confirm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GOV-008: clicking delete shows ConfirmDialog and does NOT call window.confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockApi.get.mockResolvedValue({
      data: { data: [mkMsg(1, false)], pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } },
    });

    render(<MessagesTab onUnreadCountChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Subject 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /chirish/i }));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
