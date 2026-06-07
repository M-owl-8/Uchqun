import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Stable mock handles ───────────────────────────────────────────────────────

const mockToastError   = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin1', role: 'admin', schoolId: 'school1' } }),
}));

vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ error: mockToastError, success: mockToastSuccess }),
}));

// Minimal mock — real data not needed; tests verify structure, not content.
vi.mock('@shared/config/quarterlyJournalItems', () => ({
  QUARTERLY_JOURNAL_ITEMS: {
    infoSystem:    [{ code: 'info_a', textUz: 'Ахборот А' }, { code: 'info_b', textUz: 'Ахборот Б' }],
    parentWork:    [{ code: 'par_a',  textUz: 'Ота-она А' }],
    documentation: [{ code: 'doc_a',  textUz: 'Ҳужжат А'  }],
    careQuality:   [{ code: 'care_a', textUz: 'Парвариш А' }],
    conditions:    [{ code: 'shar_a', textUz: 'Шароит А'   }],
  },
  QUARTERLY_ITEM_COUNT: 6,
}));

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

// ── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_CHILDREN = [
  { id: 'c1', firstName: 'Алишер', lastName: 'Навоий',   class: '1A' },
  { id: 'c2', firstName: 'Зебо',   lastName: 'Каримова', class: '2B' },
];

const SAMPLE_IRR    = { id: 'irr1', childId: 'c1', status: 'active' };
const SAMPLE_PERIODS = [
  { id: 'p1', irrId: 'irr1', periodStart: '2026-01-01', periodEnd: '2026-03-31',
    teacherSignedAt: '2026-03-15T10:00:00Z', teacherSignedBy: 'teacher1',
    managerSignedAt: null, managerSignedBy: null },
  { id: 'p2', irrId: 'irr1', periodStart: '2026-04-01', periodEnd: '2026-06-30',
    teacherSignedAt: null, teacherSignedBy: null,
    managerSignedAt: '2026-05-01T10:00:00Z', managerSignedBy: 'admin1' },
];

const SAMPLE_QUARTERLY = [
  { id: 'q1', quarterStart: '2026-01-01', quarterEnd: '2026-03-31', notes: 'Яхши' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function stubDefault(api) {
  api.get.mockImplementation((url) => {
    if (url === '/teacher/children')              return Promise.resolve({ data: { data: SAMPLE_CHILDREN } });
    if (url.includes('/irr/quarterly-entries'))   return Promise.resolve({ data: { data: [] } });
    return Promise.reject(new Error('Unexpected GET: ' + url));
  });
  api.post.mockResolvedValue({ data: { data: {} } });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminIRR', () => {
  beforeEach(() => {
    vi.resetModules();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
  });

  it('renders children list after load', async () => {
    const api = (await import('../../services/api')).default;
    stubDefault(api);
    const { default: AdminIRR } = await import('../../pages/AdminIRR');
    render(React.createElement(AdminIRR));

    await waitFor(() => expect(screen.getByTestId('manager-irr-page')).toBeTruthy());
    expect(screen.getByTestId('child-row-c1')).toBeTruthy();
    expect(screen.getByTestId('child-row-c2')).toBeTruthy();
  });

  it('loads and shows goal periods when child row is expanded', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockImplementation((url) => {
      if (url === '/teacher/children')             return Promise.resolve({ data: { data: SAMPLE_CHILDREN } });
      if (url === '/teacher/children/c1/irr')      return Promise.resolve({ data: { data: SAMPLE_IRR } });
      if (url === '/teacher/irr/irr1/goal-periods') return Promise.resolve({ data: { data: SAMPLE_PERIODS } });
      if (url.includes('/irr/quarterly-entries'))  return Promise.resolve({ data: { data: [] } });
      return Promise.reject(new Error('Unexpected GET: ' + url));
    });
    const { default: AdminIRR } = await import('../../pages/AdminIRR');
    render(React.createElement(AdminIRR));

    await waitFor(() => expect(screen.getByTestId('child-row-c1')).toBeTruthy());

    const rowBtn = screen.getByTestId('child-row-c1').querySelector('button');
    fireEvent.click(rowBtn);

    await waitFor(() => expect(screen.getByTestId('period-row-p1')).toBeTruthy());
    expect(screen.getByTestId('period-row-p2')).toBeTruthy();
  });

  it('sign button calls POST and updates period to signed', async () => {
    const signedPeriod = { ...SAMPLE_PERIODS[0], managerSignedAt: '2026-05-26T10:00:00Z', managerSignedBy: 'admin1' };
    const api = (await import('../../services/api')).default;
    api.get.mockImplementation((url) => {
      if (url === '/teacher/children')             return Promise.resolve({ data: { data: [SAMPLE_CHILDREN[0]] } });
      if (url === '/teacher/children/c1/irr')      return Promise.resolve({ data: { data: SAMPLE_IRR } });
      if (url === '/teacher/irr/irr1/goal-periods') return Promise.resolve({ data: { data: [SAMPLE_PERIODS[0]] } });
      if (url.includes('/irr/quarterly-entries'))  return Promise.resolve({ data: { data: [] } });
      return Promise.reject(new Error('Unexpected GET: ' + url));
    });
    api.post.mockImplementation((url) => {
      if (url === '/teacher/goal-periods/p1/sign') return Promise.resolve({ data: { data: signedPeriod } });
      return Promise.reject(new Error('Unexpected POST: ' + url));
    });

    const { default: AdminIRR } = await import('../../pages/AdminIRR');
    render(React.createElement(AdminIRR));

    await waitFor(() => expect(screen.getByTestId('child-row-c1')).toBeTruthy());
    const rowBtn = screen.getByTestId('child-row-c1').querySelector('button');
    fireEvent.click(rowBtn);

    await waitFor(() => expect(screen.getByTestId('sign-btn-p1')).toBeTruthy());
    fireEvent.click(screen.getByTestId('sign-btn-p1'));

    await waitFor(() => expect(screen.getByTestId('signed-badge-p1')).toBeTruthy());
    expect(api.post).toHaveBeenCalledWith('/teacher/goal-periods/p1/sign');
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it('shows no-IRR message when child has no IRR (404)', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockImplementation((url) => {
      if (url === '/teacher/children')        return Promise.resolve({ data: { data: [SAMPLE_CHILDREN[0]] } });
      if (url === '/teacher/children/c1/irr') return Promise.reject({ response: { status: 404 } });
      if (url.includes('/irr/quarterly-entries')) return Promise.resolve({ data: { data: [] } });
      return Promise.reject(new Error('Unexpected GET: ' + url));
    });

    const { default: AdminIRR } = await import('../../pages/AdminIRR');
    render(React.createElement(AdminIRR));

    await waitFor(() => expect(screen.getByTestId('child-row-c1')).toBeTruthy());
    const rowBtn = screen.getByTestId('child-row-c1').querySelector('button');
    fireEvent.click(rowBtn);

    await waitFor(() => expect(screen.getByTestId('no-irr-c1')).toBeTruthy());
  });

  it('quarterly tab shows form and submits POST /admin/irr/quarterly-entries', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockImplementation((url) => {
      if (url === '/teacher/children')           return Promise.resolve({ data: { data: [] } });
      if (url.includes('/irr/quarterly-entries')) return Promise.resolve({ data: { data: [] } });
      return Promise.reject(new Error('Unexpected GET: ' + url));
    });
    api.post.mockResolvedValue({ data: { data: { id: 'newQ' } } });

    const { default: AdminIRR } = await import('../../pages/AdminIRR');
    render(React.createElement(AdminIRR));

    await waitFor(() => expect(screen.getByTestId('manager-irr-page')).toBeTruthy());

    fireEvent.click(screen.getByTestId('tab-quarterly'));
    expect(screen.getByTestId('quarterly-tab')).toBeTruthy();
    expect(screen.getByTestId('quarterly-form')).toBeTruthy();

    // Structured checklist sections are rendered
    expect(screen.getByTestId('section-infoSystemData')).toBeTruthy();
    expect(screen.getByTestId('section-parentWorkData')).toBeTruthy();
    // infoSystem has 2 mock items; parentWork has 1
    expect(screen.getAllByTestId(/^item-info_/)).toHaveLength(2);
    expect(screen.getByTestId('item-par_a')).toBeTruthy();

    // Toggle one checkbox (info_a → true)
    fireEvent.click(screen.getByTestId('item-info_a'));

    fireEvent.change(screen.getByTestId('quarter-start'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByTestId('quarter-end'),   { target: { value: '2026-03-31' } });
    fireEvent.click(screen.getByTestId('quarterly-submit'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/admin/irr/quarterly-entries',
      expect.objectContaining({
        quarterStart: '2026-01-01',
        quarterEnd:   '2026-03-31',
        // code→boolean shape: checked item is true, unchecked is false
        infoSystemData: expect.objectContaining({ info_a: true, info_b: false }),
        parentWorkData: expect.objectContaining({ par_a: false }),
      })
    ));
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it('quarterly form shows duplicate-quarter error toast on 409', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockImplementation((url) => {
      if (url === '/teacher/children')           return Promise.resolve({ data: { data: [] } });
      if (url.includes('/irr/quarterly-entries')) return Promise.resolve({ data: { data: [] } });
      return Promise.reject(new Error('Unexpected GET: ' + url));
    });
    api.post.mockRejectedValue({ response: { status: 409 } });

    const { default: AdminIRR } = await import('../../pages/AdminIRR');
    render(React.createElement(AdminIRR));

    await waitFor(() => expect(screen.getByTestId('manager-irr-page')).toBeTruthy());
    fireEvent.click(screen.getByTestId('tab-quarterly'));

    fireEvent.change(screen.getByTestId('quarter-start'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByTestId('quarter-end'),   { target: { value: '2026-03-31' } });
    fireEvent.click(screen.getByTestId('quarterly-submit'));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('quarterly tab lists existing entries from GET /admin/irr/quarterly-entries', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockImplementation((url) => {
      if (url === '/teacher/children')           return Promise.resolve({ data: { data: [] } });
      if (url.includes('/irr/quarterly-entries')) return Promise.resolve({ data: { data: SAMPLE_QUARTERLY } });
      return Promise.reject(new Error('Unexpected GET: ' + url));
    });

    const { default: AdminIRR } = await import('../../pages/AdminIRR');
    render(React.createElement(AdminIRR));

    fireEvent.click(screen.getByTestId('tab-quarterly'));
    await waitFor(() => expect(screen.getByTestId('quarterly-entry-q1')).toBeTruthy());
  });
});
