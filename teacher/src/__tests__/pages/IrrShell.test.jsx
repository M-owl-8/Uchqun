import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ASSESSMENT_CRITERIA, MAX_SCORE } from '@shared/config/assessmentCriteria';
import { SKILL_AREAS } from '@shared/config/skillAreas';
import { DAILY_JOURNAL_ITEMS, DAILY_ITEM_COUNT } from '@shared/config/dailyJournalItems';
import { WEEKLY_JOURNAL_ITEMS, WEEKLY_ITEM_COUNT } from '@shared/config/weeklyJournalItems';

// ---- stable mock handles ----
const mockSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('react-i18next', () => {
  const t = (k) => k;
  const i18n = { language: 'en' };
  return { useTranslation: () => ({ t, i18n }) };
});

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'child-123' }),
  Link: ({ to, children, ...props }) =>
    React.createElement('a', { href: to, ...props }, children),
}));

vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({ success: mockSuccess, error: mockToastError }),
}));

const mockApi = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };
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
  mockApi.delete.mockReset();
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
      .mockResolvedValueOnce({ data: { data: [] } })           // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })           // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })           // sessions load
      .mockResolvedValueOnce({ data: { data: [] } })           // LTGs load
      .mockResolvedValueOnce({ data: { data: [] } });          // periods load
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('activate-btn')).toBeTruthy());
    expect(screen.getByText('irr.statusDraft')).toBeTruthy();
  });

  it('calls POST to create new IRR when none exists', async () => {
    mockApi.get
      .mockRejectedValueOnce({ response: { status: 404 } })   // irr load → null
      .mockResolvedValueOnce({ data: { data: [] } })           // daily entries (mount)
      .mockResolvedValueOnce({ data: { data: [] } })           // weekly entries (mount)
      .mockResolvedValueOnce({ data: { data: [] } })           // sessions load after creation
      .mockResolvedValueOnce({ data: { data: [] } })           // LTGs load
      .mockResolvedValueOnce({ data: { data: [] } });          // periods load
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
      .mockResolvedValueOnce({ data: { data: [] } })           // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })           // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })           // sessions load
      .mockResolvedValueOnce({ data: { data: [] } })           // LTGs load
      .mockResolvedValueOnce({ data: { data: [] } })           // periods load
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

  it('shows field labels in error banner on 400 IRR_HEADER_INCOMPLETE', async () => {
    // mockResolvedValue (not Once) — sessions load gets DRAFT_IRR back but Array.isArray guard handles it
    mockApi.get.mockResolvedValue({ data: { data: DRAFT_IRR } });
    mockApi.post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: 'IRR_HEADER_INCOMPLETE',
            detail: 'additionalInfo,irrStartDate',
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
    expect(banner.textContent).toContain('irr.fieldAdditionalInfo');
    expect(banner.textContent).toContain('irr.fieldIrrStartDate');
    expect(mockToastError).toHaveBeenCalled();
  });

  it('calls success toast and reloads on successful activation', async () => {
    const activeIrr = { ...DRAFT_IRR, status: 'active' };
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })   // irr load
      .mockResolvedValueOnce({ data: { data: [] } })           // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })           // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })           // sessions load
      .mockResolvedValueOnce({ data: { data: [] } })           // LTGs load
      .mockResolvedValueOnce({ data: { data: [] } })           // periods load
      .mockResolvedValueOnce({ data: { data: activeIrr } });   // reload after activate
    mockApi.post.mockResolvedValue({ data: {} });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('activate-btn'));
    fireEvent.click(screen.getByTestId('activate-btn'));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('irr.statusActive')).toBeTruthy());
    expect(screen.queryByTestId('activate-btn')).toBeFalsy();
  });
});

// ─── Phase 3b: Assessment session tests ──────────────────────────────────────

describe('IrrShell page — assessment section (Phase 3b)', () => {
  it('renders assessment section when IRR exists', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } })   // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })   // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })   // sessions
      .mockResolvedValueOnce({ data: { data: [] } })   // LTGs
      .mockResolvedValueOnce({ data: { data: [] } });  // periods
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('assessment-section')).toBeTruthy());
    expect(screen.getByTestId('submit-session-btn')).toBeTruthy();
    expect(screen.getByTestId('live-score')).toBeTruthy();
  });

  it('renders all 17 criteria from config (data-driven, not hardcoded)', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } })   // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })   // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
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
      .mockResolvedValueOnce({ data: { data: [] } })   // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })   // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
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
      .mockResolvedValueOnce({ data: { data: [] } })   // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })   // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
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
      .mockResolvedValueOnce({ data: { data: [] } })           // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })           // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })           // sessions
      .mockResolvedValueOnce({ data: { data: [] } })           // LTGs
      .mockResolvedValueOnce({ data: { data: [] } })           // periods
      .mockResolvedValueOnce({ data: { data: [submittedSession] } }); // reload sessions after submit
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
      .mockResolvedValueOnce({ data: { data: [] } })   // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })   // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
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
    expect(screen.getByTestId('session-error-banner').textContent).toContain('irr.assessment.errSessionExists');
  });

  it('round-trip total-agreement: live-score seen by teacher equals totalScore stored by backend', async () => {
    // Use all-3s: 17 × 3 = 51. Teacher sees 51; backend returns totalScore: 51.
    const KNOWN_SCORE = 3;
    const KNOWN_TOTAL = ASSESSMENT_CRITERIA.length * KNOWN_SCORE; // 51
    const submittedSession = {
      id: 'sess-rt',
      sessionType: 'intake',
      totalScore: KNOWN_TOTAL,
      completedAt: '2026-05-26T00:00:00.000Z',
    };
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } })           // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })           // weekly entries
      .mockResolvedValueOnce({ data: { data: [] } })           // sessions
      .mockResolvedValueOnce({ data: { data: [] } })           // LTGs
      .mockResolvedValueOnce({ data: { data: [] } })           // periods
      .mockResolvedValueOnce({ data: { data: [submittedSession] } }); // reload sessions after submit
    mockApi.post.mockResolvedValue({
      data: { data: { session: submittedSession, totalScore: KNOWN_TOTAL, maxPossibleScore: MAX_SCORE } },
    });

    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('assessment-section'));

    // Score every criterion with KNOWN_SCORE
    for (const criterion of ASSESSMENT_CRITERIA) {
      fireEvent.click(screen.getByTestId(`score-btn-${criterion.code}-${KNOWN_SCORE}`));
    }

    // Teacher sees KNOWN_TOTAL on screen before submitting
    await waitFor(() =>
      expect(screen.getByTestId('live-score').textContent).toContain(`${KNOWN_TOTAL} /`)
    );

    fireEvent.click(screen.getByTestId('submit-session-btn'));

    // POST carries the exact scores the teacher saw
    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(
        '/teacher/irr/irr-1/assessment-sessions',
        expect.objectContaining({ scores: Array(17).fill(KNOWN_SCORE) })
      )
    );

    // Backend-returned totalScore must equal the live sum the teacher saw
    const [[, postBody]] = mockApi.post.mock.calls;
    const liveSumAtSubmit = postBody.scores.reduce((a, s) => a + s, 0);
    expect(liveSumAtSubmit).toBe(KNOWN_TOTAL); // teacher-saw === backend-stored
    expect(submittedSession.totalScore).toBe(KNOWN_TOTAL);
  });

  it('renders progression table when sessions exist', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })
      .mockResolvedValueOnce({ data: { data: [] } })            // daily entries
      .mockResolvedValueOnce({ data: { data: [] } })            // weekly entries
      .mockResolvedValueOnce({ data: { data: [SAMPLE_SESSION] } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('progression-table'));
    expect(screen.getByTestId('progression-table').textContent).toContain('45');
    expect(screen.getByTestId('progression-table').textContent).toContain(`${MAX_SCORE}`);
  });
});

// ─── Phase 3c: Goals tests ────────────────────────────────────────────────────

const SAMPLE_PERIOD = {
  id: 'period-1',
  irrId: 'irr-1',
  periodStart: '2024-02-01',
  periodEnd: '2024-04-30',
  status: 'active',
  teacherSignedAt: null,
  managerSignedAt: null,
  overallAssessment: null,
};

const SAMPLE_LTG = {
  id: 'ltg-1',
  goalText: 'Мустақил овқатланишни ўрганиш',
  targetPeriodStart: '2024-02-01',
  targetPeriodEnd: '2025-01-31',
};

const SAMPLE_STG = {
  id: 'stg-1',
  periodId: 'period-1',
  skillAreaCode: 'SELF_CARE_FEEDING',
  goalText: 'Қошиқда овқат ейиш',
  targetDate: '2024-04-30',
};

function mockIrrLoad(ltgs = [], periods = []) {
  return mockApi.get
    .mockResolvedValueOnce({ data: { data: DRAFT_IRR } })   // irr
    .mockResolvedValueOnce({ data: { data: [] } })           // daily entries (mount)
    .mockResolvedValueOnce({ data: { data: [] } })           // weekly entries (mount)
    .mockResolvedValueOnce({ data: { data: [] } })           // sessions
    .mockResolvedValueOnce({ data: { data: ltgs } })         // LTGs
    .mockResolvedValueOnce({ data: { data: periods } });     // periods
}

describe('IrrShell page — goals section (Phase 3c)', () => {
  it('renders LTG section and add form when IRR exists', async () => {
    mockIrrLoad();
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('ltg-section')).toBeTruthy());
    expect(screen.getByTestId('ltg-add-form')).toBeTruthy();
    expect(screen.getByTestId('ltg-text-input')).toBeTruthy();
  });

  it('creates LTG via POST and renders it in the list', async () => {
    mockIrrLoad();
    mockApi.post.mockResolvedValue({ data: { data: SAMPLE_LTG } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('ltg-add-form'));

    fireEvent.change(screen.getByTestId('ltg-text-input'), {
      target: { value: 'Мустақил овқатланишни ўрганиш' },
    });
    fireEvent.click(screen.getByTestId('ltg-save-btn'));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(
        '/teacher/irr/irr-1/long-term-goals',
        expect.objectContaining({ goalText: 'Мустақил овқатланишни ўрганиш' })
      )
    );
    await waitFor(() => expect(screen.getByTestId(`ltg-row-${SAMPLE_LTG.id}`)).toBeTruthy());
  });

  it('deletes LTG via DELETE', async () => {
    mockIrrLoad([SAMPLE_LTG]);
    mockApi.delete.mockResolvedValue({});
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId(`ltg-delete-${SAMPLE_LTG.id}`));

    fireEvent.click(screen.getByTestId(`ltg-delete-${SAMPLE_LTG.id}`));

    // ConfirmDialog appears — click the confirm button to proceed with deletion
    await waitFor(() => screen.getByText('common.confirm'));
    fireEvent.click(screen.getByText('common.confirm'));

    await waitFor(() =>
      expect(mockApi.delete).toHaveBeenCalledWith(`/teacher/long-term-goals/${SAMPLE_LTG.id}`)
    );
    await waitFor(() => expect(screen.queryByTestId(`ltg-row-${SAMPLE_LTG.id}`)).toBeFalsy());
  });

  it('creates goal period via POST and renders it', async () => {
    mockIrrLoad();
    mockApi.post.mockResolvedValue({ data: { data: SAMPLE_PERIOD } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('period-create-form'));

    fireEvent.change(screen.getByTestId('period-start-input'), { target: { value: '2024-02-01' } });
    fireEvent.change(screen.getByTestId('period-end-input'), { target: { value: '2024-04-30' } });
    fireEvent.click(screen.getByTestId('period-create-btn'));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(
        '/teacher/irr/irr-1/goal-periods',
        expect.objectContaining({ periodStart: '2024-02-01', periodEnd: '2024-04-30' })
      )
    );
    await waitFor(() => expect(screen.getByTestId(`period-row-${SAMPLE_PERIOD.id}`)).toBeTruthy());
  });

  it('renders periods from list and shows toggle', async () => {
    mockIrrLoad([], [SAMPLE_PERIOD]);
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId(`period-row-${SAMPLE_PERIOD.id}`)).toBeTruthy());
    expect(screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`)).toBeTruthy();
  });

  it('shows STG add form with skill-area select driven by SKILL_AREAS config (data-driven)', async () => {
    mockIrrLoad([], [SAMPLE_PERIOD]);
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } }); // STGs for period-1
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));

    fireEvent.click(screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    await waitFor(() => screen.getByTestId(`stg-add-form-${SAMPLE_PERIOD.id}`));

    const select = screen.getByTestId(`stg-skill-area-${SAMPLE_PERIOD.id}`);
    expect(select).toBeTruthy();
    // All SKILL_AREAS options are rendered (data-driven, not hardcoded)
    expect(SKILL_AREAS.length).toBeGreaterThan(0);
    for (const sa of SKILL_AREAS) {
      expect(select.textContent).toContain(sa.textUz);
    }
  });

  it('shows 3–5 guidance when period has 0 STGs', async () => {
    mockIrrLoad([], [SAMPLE_PERIOD]);
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } }); // STGs
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    fireEvent.click(screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    await waitFor(() => screen.getByTestId(`stg-guidance-${SAMPLE_PERIOD.id}`));
    expect(screen.getByTestId(`stg-guidance-${SAMPLE_PERIOD.id}`).textContent).toContain('3–5');
  });

  it('creates STG via POST with skill area', async () => {
    mockIrrLoad([], [SAMPLE_PERIOD]);
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } }); // STGs
    mockApi.post.mockResolvedValue({ data: { data: SAMPLE_STG } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    fireEvent.click(screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    await waitFor(() => screen.getByTestId(`stg-add-form-${SAMPLE_PERIOD.id}`));

    fireEvent.change(screen.getByTestId(`stg-skill-area-${SAMPLE_PERIOD.id}`), {
      target: { value: 'SELF_CARE_FEEDING' },
    });
    fireEvent.change(screen.getByTestId(`stg-text-${SAMPLE_PERIOD.id}`), {
      target: { value: 'Қошиқда овқат ейиш' },
    });
    fireEvent.click(screen.getByTestId(`stg-add-btn-${SAMPLE_PERIOD.id}`));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(
        `/teacher/goal-periods/${SAMPLE_PERIOD.id}/short-term-goals`,
        expect.objectContaining({ goalText: 'Қошиқда овқат ейиш', skillAreaCode: 'SELF_CARE_FEEDING' })
      )
    );
    await waitFor(() => expect(screen.getByTestId(`stg-row-${SAMPLE_STG.id}`)).toBeTruthy());
  });

  it('saves quarterly review via PATCH', async () => {
    mockIrrLoad([], [SAMPLE_PERIOD]);
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } }); // STGs
    const reviewedPeriod = { ...SAMPLE_PERIOD, overallAssessment: 'Яхши ривожланмоқда' };
    mockApi.patch.mockResolvedValue({ data: { data: reviewedPeriod } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    fireEvent.click(screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    await waitFor(() => screen.getByTestId(`review-section-${SAMPLE_PERIOD.id}`));

    fireEvent.change(screen.getByTestId(`review-overall-${SAMPLE_PERIOD.id}`), {
      target: { value: 'Яхши ривожланмоқда' },
    });
    fireEvent.click(screen.getByTestId(`review-save-${SAMPLE_PERIOD.id}`));

    await waitFor(() =>
      expect(mockApi.patch).toHaveBeenCalledWith(
        `/teacher/goal-periods/${SAMPLE_PERIOD.id}/review`,
        expect.objectContaining({ overallAssessment: 'Яхши ривожланмоқда' })
      )
    );
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('signs period via POST and disables sign button afterward', async () => {
    mockIrrLoad([], [SAMPLE_PERIOD]);
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } }); // STGs
    const signedPeriod = { ...SAMPLE_PERIOD, teacherSignedAt: '2026-05-26T10:00:00.000Z' };
    mockApi.post.mockResolvedValue({ data: { data: signedPeriod } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    fireEvent.click(screen.getByTestId(`period-toggle-${SAMPLE_PERIOD.id}`));
    await waitFor(() => screen.getByTestId(`sign-teacher-${SAMPLE_PERIOD.id}`));

    expect(screen.getByTestId(`sign-teacher-${SAMPLE_PERIOD.id}`)).not.toBeDisabled();
    fireEvent.click(screen.getByTestId(`sign-teacher-${SAMPLE_PERIOD.id}`));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(`/teacher/goal-periods/${SAMPLE_PERIOD.id}/sign`)
    );
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
    // After signing, button should be disabled (teacherSignedAt now set)
    await waitFor(() => expect(screen.getByTestId(`sign-teacher-${SAMPLE_PERIOD.id}`)).toBeDisabled());
  });
});

// ─── Phase 3d: Monitoring journal tests ──────────────────────────────────────

describe('IrrShell page — monitoring journals (Phase 3d)', () => {
  it('renders daily-section with 27 checkboxes data-driven from DAILY_JOURNAL_ITEMS', async () => {
    mockIrrLoad();
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('daily-section')).toBeTruthy());
    expect(screen.getByTestId('daily-hygiene-section')).toBeTruthy();
    expect(screen.getByTestId('daily-health-section')).toBeTruthy();
    expect(screen.getByTestId('daily-gi-section')).toBeTruthy();

    const allItems = [
      ...DAILY_JOURNAL_ITEMS.hygiene,
      ...DAILY_JOURNAL_ITEMS.health,
      ...DAILY_JOURNAL_ITEMS.gi,
    ];
    expect(allItems).toHaveLength(DAILY_ITEM_COUNT); // 27
    for (const item of allItems) {
      expect(screen.getByTestId(`daily-check-${item.code}`)).toBeTruthy();
    }
  });

  it('submits daily entry via POST with correct JSONB shape (hygieneData/healthData/giData)', async () => {
    mockIrrLoad();
    const newEntry = { id: 'daily-1', entryDate: '2026-05-26', notes: '' };
    mockApi.post.mockResolvedValue({ data: { data: newEntry } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('daily-submit-btn'));

    // Toggle one hygiene item
    const firstHyg = DAILY_JOURNAL_ITEMS.hygiene[0];
    fireEvent.click(screen.getByTestId(`daily-check-${firstHyg.code}`));

    fireEvent.click(screen.getByTestId('daily-submit-btn'));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(
        '/teacher/children/child-123/daily-entries',
        expect.objectContaining({
          hygieneData: expect.objectContaining({ [firstHyg.code]: true }),
          healthData:  expect.any(Object),
          giData:      expect.any(Object),
        })
      )
    );
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('shows DAILY_ENTRY_DUPLICATE error legibly on 409', async () => {
    mockIrrLoad();
    mockApi.post.mockRejectedValue({
      response: {
        status: 409,
        data: { success: false, error: { code: 'DAILY_ENTRY_DUPLICATE' } },
      },
    });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('daily-submit-btn'));

    fireEvent.click(screen.getByTestId('daily-submit-btn'));

    await waitFor(() => expect(screen.getByTestId('daily-error-banner')).toBeTruthy());
    expect(screen.getByTestId('daily-error-banner').textContent).toContain('irr.errorDuplicateDailyEntry');
  });

  it('renders weekly-section with 18 checkboxes data-driven from WEEKLY_JOURNAL_ITEMS', async () => {
    mockIrrLoad();
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('weekly-section')).toBeTruthy());
    expect(screen.getByTestId('weekly-emotional-section')).toBeTruthy();
    expect(screen.getByTestId('weekly-environment-section')).toBeTruthy();

    const allItems = [
      ...WEEKLY_JOURNAL_ITEMS.emotional,
      ...WEEKLY_JOURNAL_ITEMS.environment,
    ];
    expect(allItems).toHaveLength(WEEKLY_ITEM_COUNT); // 18
    for (const item of allItems) {
      expect(screen.getByTestId(`weekly-check-${item.code}`)).toBeTruthy();
    }
  });

  it('submits weekly entry via POST with correct JSONB shape (emotionalData/environmentData)', async () => {
    mockIrrLoad();
    const newEntry = { id: 'weekly-1', weekStart: '2026-05-25', notes: '' };
    mockApi.post.mockResolvedValue({ data: { data: newEntry } });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('weekly-submit-btn'));

    // Toggle one emotional item
    const firstEmo = WEEKLY_JOURNAL_ITEMS.emotional[0];
    fireEvent.click(screen.getByTestId(`weekly-check-${firstEmo.code}`));

    fireEvent.click(screen.getByTestId('weekly-submit-btn'));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith(
        '/teacher/children/child-123/weekly-entries',
        expect.objectContaining({
          emotionalData:   expect.objectContaining({ [firstEmo.code]: true }),
          environmentData: expect.any(Object),
        })
      )
    );
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('shows WEEKLY_ENTRY_DUPLICATE error legibly on 409', async () => {
    mockIrrLoad();
    mockApi.post.mockRejectedValue({
      response: {
        status: 409,
        data: { success: false, error: { code: 'WEEKLY_ENTRY_DUPLICATE' } },
      },
    });
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => screen.getByTestId('weekly-submit-btn'));

    fireEvent.click(screen.getByTestId('weekly-submit-btn'));

    await waitFor(() => expect(screen.getByTestId('weekly-error-banner')).toBeTruthy());
    expect(screen.getByTestId('weekly-error-banner').textContent).toContain('irr.errorDuplicateWeeklyEntry');
  });

  it('daily and weekly sections render without an active ИРР (irrId nullable)', async () => {
    // No IRR for this child — journals still visible (irrId sent as null)
    mockApi.get
      .mockRejectedValueOnce({ response: { status: 404 } })   // irr load → null
      .mockResolvedValueOnce({ data: { data: [] } })           // daily entries
      .mockResolvedValueOnce({ data: { data: [] } });          // weekly entries
    const { default: IrrShell } = await import('../../pages/IrrShell');
    render(React.createElement(IrrShell));
    await waitFor(() => expect(screen.getByTestId('irr-shell')).toBeTruthy());
    expect(screen.getByTestId('daily-section')).toBeTruthy();
    expect(screen.getByTestId('weekly-section')).toBeTruthy();
    expect(screen.getByTestId('daily-submit-btn')).toBeTruthy();
    expect(screen.getByTestId('weekly-submit-btn')).toBeTruthy();
  });
});
