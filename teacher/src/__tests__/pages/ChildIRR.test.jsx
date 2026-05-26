import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// --- stable mock handles ---
const mockToastError = vi.fn();

let mockChildContext = {
  selectedChildId: 'c1',
};

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t, i18n: { language: 'uz' } }) };
});

vi.mock('../../parent/context/ChildContext', () => ({
  useChild: () => mockChildContext,
}));

vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({ error: mockToastError }),
}));

vi.mock('../../parent/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const SAMPLE_IRR = {
  id: 'irr1',
  status: 'active',
  completedAt: null,
};

const SAMPLE_SESSIONS = [
  {
    id: 's1',
    sessionType: 'initial',
    completedAt: '2026-01-01T00:00:00.000Z',
    totalScore: 30,
    maxPossibleScore: 68,
  },
  {
    id: 's2',
    sessionType: '3_month',
    completedAt: '2026-04-01T00:00:00.000Z',
    totalScore: 45,
    maxPossibleScore: 68,
  },
];

const SAMPLE_GOALS = {
  longTermGoals: [
    {
      id: 'ltg1',
      skillArea: 'COMMUNICATION',
      goalText: 'Нутқни ривожлантириш',
      targetDate: '2026-12-31',
      status: 'in_progress',
    },
  ],
  periods: [
    {
      id: 'p1',
      periodLabel: '1-чорак',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      signedAt: '2026-01-02T00:00:00.000Z',
      status: 'completed',
    },
  ],
  shortTermGoals: [
    {
      id: 'stg1',
      ltgId: 'ltg1',
      periodId: 'p1',
      stgText: 'Соддa сўзлар билан гаплашиш',
      progressStatus: 'achieved',
      review: 'Яхши ривожланди',
      parentRecommendations: 'Уйда ҳар куни китоб ўқинг',
      discussionDate: '2026-03-15',
    },
  ],
};

function stubLoad(api, opts = {}) {
  const { irrError = null, sessionsData = SAMPLE_SESSIONS, goalsData = SAMPLE_GOALS } = opts;
  api.get.mockImplementation((url) => {
    if (url.includes('/irr/assessment')) return Promise.resolve({ data: { data: sessionsData } });
    if (url.includes('/irr/goals')) return Promise.resolve({ data: { data: goalsData } });
    if (url.includes('/irr')) {
      if (irrError) return Promise.reject(irrError);
      return Promise.resolve({ data: { data: SAMPLE_IRR } });
    }
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('CL-013e ChildIRR — parent view-only (Phase 3e)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockChildContext = { selectedChildId: 'c1' };
  });

  it('renders progression section with session rows after load', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildIRR } = await import('../../parent/pages/ChildIRR');
    render(React.createElement(ChildIRR));
    await waitFor(() => expect(screen.getByTestId('session-row-s1')).toBeTruthy());
    expect(screen.getByTestId('session-row-s2')).toBeTruthy();
    expect(screen.getByTestId('progression-section')).toBeTruthy();
  });

  it('surfaces parentRecommendations prominently in the STG row', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildIRR } = await import('../../parent/pages/ChildIRR');
    render(React.createElement(ChildIRR));
    await waitFor(() => expect(screen.getByTestId('parent-rec-stg1')).toBeTruthy());
    expect(screen.getByTestId('parent-rec-stg1').textContent).toContain('Уйда ҳар куни китоб ўқинг');
  });

  it('shows gentle empty state on 404 — not an error page', async () => {
    const api = (await import('../../parent/services/api')).default;
    const err404 = Object.assign(new Error('Not Found'), { response: { status: 404 } });
    stubLoad(api, { irrError: err404 });
    const { default: ChildIRR } = await import('../../parent/pages/ChildIRR');
    render(React.createElement(ChildIRR));
    await waitFor(() => expect(screen.getByTestId('irr-not-found')).toBeTruthy());
    // Must not render as an error state
    expect(screen.queryByTestId('irr-load-error')).toBeNull();
  });

  it('surfaces cold-load network error as irr-load-error state', async () => {
    const api = (await import('../../parent/services/api')).default;
    const err500 = Object.assign(new Error('Server Error'), { response: { status: 500 } });
    stubLoad(api, { irrError: err500 });
    const { default: ChildIRR } = await import('../../parent/pages/ChildIRR');
    render(React.createElement(ChildIRR));
    await waitFor(() => expect(screen.getByTestId('irr-load-error')).toBeTruthy());
    expect(screen.queryByTestId('irr-not-found')).toBeNull();
  });

  it('renders goals view-only — no form, no inputs, no submit buttons', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildIRR } = await import('../../parent/pages/ChildIRR');
    render(React.createElement(ChildIRR));
    await waitFor(() => expect(screen.getByTestId('child-irr-page')).toBeTruthy());
    expect(document.querySelector('form')).toBeNull();
    expect(document.querySelector('input')).toBeNull();
    expect(document.querySelector('textarea')).toBeNull();
    // Only buttons allowed are outside the loaded content (none in success path)
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('calls ONLY the 3 parent read endpoints — no teacher or per-criterion URLs', async () => {
    const api = (await import('../../parent/services/api')).default;
    api.get.mockClear();
    stubLoad(api);
    const { default: ChildIRR } = await import('../../parent/pages/ChildIRR');
    render(React.createElement(ChildIRR));
    await waitFor(() => expect(screen.getByTestId('child-irr-page')).toBeTruthy());
    expect(api.get.mock.calls).toHaveLength(3);
    const calledUrls = api.get.mock.calls.map(([url]) => url);
    calledUrls.forEach((url) => {
      expect(url).toMatch(/^\/parent\/children\/c1\/irr/);
    });
    // No teacher endpoints
    calledUrls.forEach((url) => {
      expect(url).not.toContain('/teacher/');
    });
    // No per-criterion endpoint (assessment returns aggregate only)
    calledUrls.forEach((url) => {
      expect(url).not.toContain('/criteria');
    });
  });

  it('STG rows are nested inside their parent period card', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildIRR } = await import('../../parent/pages/ChildIRR');
    render(React.createElement(ChildIRR));
    await waitFor(() => expect(screen.getByTestId('period-card-p1')).toBeTruthy());
    const periodCard = screen.getByTestId('period-card-p1');
    const stgRow = screen.getByTestId('stg-row-stg1');
    expect(periodCard.contains(stgRow)).toBeTruthy();
  });
});
