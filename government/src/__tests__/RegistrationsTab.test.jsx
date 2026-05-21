import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key, opts) => opts?.defaultValue ?? _key }),
}));

vi.mock('@shared/components/Card', () => ({
  default: ({ children, className }) => <div className={className}>{children}</div>,
}));
vi.mock('@shared/components/Button', () => ({
  default: ({ children, onClick, disabled, loading: _l, variant: _v, size: _s, className }) =>
    <button onClick={onClick} disabled={disabled} className={className}>{children}</button>,
}));
vi.mock('@shared/components/Modal', () => ({
  default: ({ isOpen, children, title, footer, onClose: _oc }) =>
    isOpen ? <div role="dialog"><h2>{title}</h2>{children}{footer}</div> : null,
}));
vi.mock('@shared/components/Textarea', () => ({
  default: ({ label, value, onChange, rows: _r, placeholder: _p }) =>
    <textarea aria-label={label} value={value} onChange={onChange} readOnly />,
}));
vi.mock('@shared/components/LoadingSpinner', () => ({
  default: () => <span>loading</span>,
}));

const RegistrationsTab = (await import('../components/tabs/RegistrationsTab.jsx')).default;

const baseProps = {
  registrationRequests: [],
  loadingRegistrations: false,
  approvingRequest: false,
  rejectingRequest: false,
  selectedRequest: null,
  rejectionReason: '',
  approvedCredentials: null,
  onApprove: vi.fn(),
  onSelectRequest: vi.fn(),
  onReject: vi.fn(),
  onCloseRequest: vi.fn(),
  onCloseCredentials: vi.fn(),
  setRejectionReason: vi.fn(),
  success: vi.fn(),
};

const mockCredentials = {
  admin: { email: 'newadmin@school.uz', firstName: 'New', lastName: 'Admin' },
  setPasswordUrl: 'https://example.com/set-password/abc123',
  telegramUsername: null,
};

describe('RegistrationsTab — GOV-002: credentials email display', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows admin.email in the read-only email input when credentials are present', () => {
    // Pre-fix: approvedCredentials.email is undefined → input shows ''
    // Post-fix: approvedCredentials.admin.email → input shows 'newadmin@school.uz'
    render(<RegistrationsTab {...baseProps} approvedCredentials={mockCredentials} />);
    expect(screen.getByDisplayValue('newadmin@school.uz')).toBeInTheDocument();
  });

  it('writes admin.email to clipboard, not undefined', () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWrite },
      configurable: true,
      writable: true,
    });
    const successFn = vi.fn();
    render(<RegistrationsTab {...baseProps} approvedCredentials={mockCredentials} success={successFn} />);

    // First copy button in the modal is for the email field
    const copyButtons = screen.getAllByText('Nusxalash');
    copyButtons[0].click();

    expect(clipboardWrite).toHaveBeenCalledWith('newadmin@school.uz');
  });
});
