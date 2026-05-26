import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ASSESSMENT_CRITERIA, MAX_SCORE } from '@shared/config/assessmentCriteria';

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

const SAMPLE_SESSION = {
  id: 'sess-1',
  sessionType: 'intake',
  totalScore: 45,
  completedAt: '2024-02-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.resetModules();
  mockSuccess.mockClear();
  mockToastError.mockClear();
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.patch.mockReset();
});

// ─── Phase 3a: Header form tests ──────────────────────────────────────────────

describe('IrrShell page — header form (Phase 3a)', () => {
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
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })   // irr load
      .mockResolvedValueOnce({ data: { data: [] } });          // sessions load
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('activate-btn')).toBeTruthy());
    expect(screen.getByText('Qoralama')).toBeTruthy();
  });

  it('calls POST to create new IRR when none exists', async () => {
    mockApi.get
      .mockRejectedValueOnce({ response: { status: 404 } })   // irr load → null
      .mockResolvedValueOnce({ data: { data: [] } });          // sessions load after creation
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
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })   // irr load
      .mockResolvedValueOnce({ data: { data: [] } })           // sessions load
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } });   // reload after PATCH
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
    // mockResolvedValue (not Once) — sessions load gets DRAFT_IRR back but Array.isArray guard handles it
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
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })   // irr load
      .mockResolvedValueOnce({ data: { data: [] } })           // sessions load
      .mockResolvedValueOnce({ data: { data: activeIrr } });   // reload after activate
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

// ─── Phase 3b: Assessment session tests ──────────────────────────────────────

describe('IrrShell page — assessment section (Phase 3b)', () => {
  it('renders assessment section when IRR exists', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('assessment-section')).toBeTruthy());
    expect(screen.getByTestId('submit-session-btn')).toBeTruthy();
    expect(screen.getByTestId('live-score')).toBeTruthy();
  });

  it('renders all 17 criteria from config (data-driven, not hardcoded)', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('assessment-section'));
    expect(ASSESSMENT_CRITERIA).toHaveLength(17);
    for (const criterion of ASSESSMENT_CRITERIA) {
      expect(screen.getByTestId(`criterion-row-${criterion.code}`)).toBeTruthy();
    }
  });

  it('selecting best option (score btn 4) stores software score 4 — explicit scoring direction test', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('assessment-section'));

    // Live score starts at 0
    expect(screen.getByTestId('live-score').textContent).toContain(`0 / ${MAX_SCORE}`);

    // Click the BEST option (score=4) for the first criterion
    const firstCriterion = ASSESSMENT_CRITERIA[0];
    const bestBtn = screen.getByTestId(`score-btn-${firstCriterion.code}-4`);
    fireEvent.click(bestBtn);

    // Live score should now be 4 (best software score, NOT 0)
    await waitFor(() =>
      expect(screen.getByTestId('live-score').textContent).toContain(`4 / ${MAX_SCORE}`)
    );

    // Click the WORST option (score=0) — live score drops back to 0
    const worstBtn = screen.getByTestId(`score-btn-${firstCriterion.code}-0`);
    fireEvent.click(worstBtn);
    await waitFor(() =>
      expect(screen.getByTestId('live-score').textContent).toContain(`0 / ${MAX_SCORE}`)
    );
  });

  it('submit session button disabled until all 17 criteria are scored', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('submit-session-btn'));

    // Initially disabled — 0 of 17 scored
    expect(screen.getByTestId('submit-session-btn')).toBeDisabled();

    // Score 16 of 17 — still disabled
    for (let i = 0; i < 16; i++) {
      fireEvent.click(screen.getByTestId(`score-btn-${ASSESSMENT_CRITERIA[i].code}-4`));
    }
    expect(screen.getByTestId('submit-session-btn')).toBeDisabled();

    // Score the last (17th) — now enabled
    fireEvent.click(screen.getByTestId(`score-btn-${ASSESSMENT_CRITERIA[16].code}-4`));
    await waitFor(() => expect(screen.getByTestId('submit-session-btn')).not.toBeDisabled());
  });

  it('submits session POST with correct endpoint and scores array', async () => {
    const submittedSession = { id: 'sess-1', sessionType: 'intake', totalScore: 68, completedAt: '2026-05-26T00:00:00.000Z' };
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [submittedSession] } });
    mockApi.post.mockResolvedValue({
      data: { data: { session: submittedSession, totalScore: 68, maxPossibleScore: 68 } },
    });

    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('assessment-section'));

    // Score all 17 criteria with best score (4)
    for (const criterion of ASSESSMENT_CRITERIA) {
      fireEvent.click(screen.getByTestId(`score-btn-${criterion.code}-4`));
    }

    await waitFor(() => expect(screen.getByTestId('submit-session-btn')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('submit-session-btn'));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(
        '/teacher/irr/irr-1/assessment-sessions',
        expect.objectContaining({ scores: Array(17).fill(4) })
      )
    );
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('shows ASSESSMENT_SESSION_EXISTS error on 409', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } });
    mockApi.post.mockRejectedValue({
      response: {
        status: 409,
        data: { success: false, error: { code: 'ASSESSMENT_SESSION_EXISTS' } },
      },
    });

    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('assessment-section'));

    // Score all 17 to enable submit
    for (const criterion of ASSESSMENT_CRITERIA) {
      fireEvent.click(screen.getByTestId(`score-btn-${criterion.code}-2`));
    }

    await waitFor(() => expect(screen.getByTestId('submit-session-btn')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('submit-session-btn'));

    await waitFor(() => expect(screen.getByTestId('session-error-banner')).toBeTruthy());
    expect(screen.getByTestId('session-error-banner').textContent).toContain('аллақачон мавжуд');
  });

  it('renders progression table when sessions exist', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [SAMPLE_SESSION] } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('progression-table'));
    expect(screen.getByTestId('progression-table').textContent).toContain('45');
    expect(screen.getByTestId('progression-table').textContent).toContain(`${MAX_SCORE}`);
  });
});
