import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '@shared/components/ConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => opts?.defaultValue ?? k }),
}));

const baseDialog = { message: 'Delete this item?', onConfirm: vi.fn() };

describe('ConfirmDialog', () => {
  it('renders nothing when dialog is null', () => {
    render(<ConfirmDialog dialog={null} onCancel={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders message when dialog is provided', () => {
    render(<ConfirmDialog dialog={baseDialog} onCancel={vi.fn()} />);
    expect(screen.getByText('Delete this item?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog dialog={{ ...baseDialog, onConfirm }} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog dialog={baseDialog} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows textarea and disables confirm when requireReason is true', () => {
    render(<ConfirmDialog dialog={{ ...baseDialog, requireReason: true }} onCancel={vi.fn()} />);
    expect(screen.getByPlaceholderText('Enter reason…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('enables confirm after typing reason', () => {
    render(<ConfirmDialog dialog={{ ...baseDialog, requireReason: true }} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Enter reason…'), { target: { value: 'spam' } });
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeDisabled();
  });

  it('passes reason to onConfirm when requireReason', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog dialog={{ message: 'Delete?', onConfirm, requireReason: true }} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Enter reason…'), { target: { value: 'outdated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledWith('outdated');
  });
});
