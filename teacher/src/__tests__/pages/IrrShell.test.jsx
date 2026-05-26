import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---- stable mock handles ----
const mockSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'child-123' }),
  Link: ({ to, children, ...props }) =>
    React.createElement('a', { href: to, ...props }, children),
}));

vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({ success: mockSuccess, error: mockToastError }),
}));

const mockApi = { get: vi.fn(), post: vi.fn(), patch: vi.fn() };
vi.mock('../../shared/services/api', () => ({ default: mockApi }));

vi.mock('lucide-react', () => ({
  ArrowLeft: () => React.createElement('span', null, '←'),
  FileText: () => React.createElement('span', null, 'doc'),
}));

const DRAFT_IRR = {
  id: 'irr-1',
  status: 'draft',
  childFullName: 'Yusupov Zafar',
  dateOfBirth: '2019-03-15',
  ageAtAssessmentStart: '5 yosh',
  ptpkIntakeDate: '2024-01-10',
  ptpkConclusionDate: '2024-01-20',
  ptpkConclusionNumber: 'PKT-001',
  ptpkDiagnosis: 'F84.0',
  ptpkNotes: '',
  irrStartDate: '2024-02-01',
  additionalInfo: "Qo'shimcha ma'lumot",
  childStrengths: '',
  riskFactors: '',
};

beforeEach(() => {
  vi.resetModules();
  mockSuccess.mockClear();
  mockToastError.mockClear();
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.patch.mockReset();
});

describe('IrrShell page', () => {
  it('renders create state when no IRR exists (404 — no toast)', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 404 } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('irr-shell')).toBeTruthy());
    expect(screen.getByTestId('save-btn')).toBeTruthy();
    expect(screen.queryByTestId('activate-btn')).toBeFalsy();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('shows error toast on non-404 load failure', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 500 } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });

  it('renders draft IRR with activate button and status badge', async () => {
    mockApi.get.mockResolvedValue({ data: { data: DRAFT_IRR } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('activate-btn')).toBeTruthy());
    expect(screen.getByText('Qoralama')).toBeTruthy();
  });

  it('calls POST to create new IRR when none exists', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 404 } });
    const created = { ...DRAFT_IRR };
    mockApi.post.mockResolvedValue({ data: { data: created } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('save-btn'));
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(
        '/teacher/children/child-123/irr',
        expect.any(Object)
      )
    );
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('calls PATCH on save when IRR already exists', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } }); // reload after save
    mockApi.patch.mockResolvedValue({});
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('save-btn'));
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() =>
      expect(mockApi.patch).toHaveBeenCalledWith(
        '/teacher/irr/irr-1',
        expect.any(Object)
      )
    );
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('shows Uzbek field labels in error banner on 400 IRR_HEADER_INCOMPLETE', async () => {
    mockApi.get.mockResolvedValue({ data: { data: DRAFT_IRR } });
    mockApi.post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: 'IRR_HEADER_INCOMPLETE',
            detail: 'Missing: additionalInfo, irrStartDate',
          },
        },
      },
    });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('activate-btn'));
    fireEvent.click(screen.getByTestId('activate-btn'));
    await waitFor(() => expect(screen.getByTestId('activate-error-banner')).toBeTruthy());
    const banner = screen.getByTestId('activate-error-banner');
    expect(banner.textContent).toContain('Қўшимча маълумотлар');
    expect(banner.textContent).toContain('ИРР бошланган сана');
    expect(mockToastError).toHaveBeenCalled();
  });

  it('calls success toast and reloads on successful activation', async () => {
    const activeIrr = { ...DRAFT_IRR, status: 'active' };
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: activeIrr } });
    mockApi.post.mockResolvedValue({ data: {} });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('activate-btn'));
    fireEvent.click(screen.getByTestId('activate-btn'));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Faol')).toBeTruthy());
    expect(screen.queryByTestId('activate-btn')).toBeFalsy();
  });
});
