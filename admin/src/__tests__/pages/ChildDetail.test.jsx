import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const a = await vi.importActual('react-router-dom');
  return {
    ...a,
    useParams: () => ({ id: 'child-1' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      state: {
        child: {
          id: 'child-1',
          firstName: 'Amin',
          lastName: 'Aliyev',
          dateOfBirth: '2020-01-01',
          gender: 'male',
          class: 'A',
        },
      },
    }),
  };
});
vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('react-i18next', () => {
  const t = (k, o) => o?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ error: vi.fn() }),
}));

import api from '../../services/api';
import ChildDetail from '../../pages/ChildDetail';

const OBSERVATIONS = [
  {
    id: 'obs-1',
    childId: 'child-1',
    observationDate: '2026-05-10',
    domain: 'cognitive',
    note: 'Good progress',
    severity: 'low',
    teacherId: 't-1',
  },
];

const GOALS = [
  {
    id: 'goal-1',
    childId: 'child-1',
    goal: 'Improve vocabulary',
    status: 'active',
    category: 'language',
    latestReviewDate: '2026-05-01',
    reviews: [],
  },
];

describe('ChildDetail (FE-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders child name from route state', async () => {
    api.get.mockResolvedValue({ data: OBSERVATIONS });
    render(<MemoryRouter><ChildDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('Amin Aliyev'));
    expect(screen.getByText('Amin Aliyev')).toBeTruthy();
  });

  it('observations tab loads and shows domain badge', async () => {
    api.get.mockResolvedValue({ data: OBSERVATIONS });
    render(<MemoryRouter><ChildDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('cognitive'));
    expect(screen.getByText('Good progress')).toBeTruthy();
    expect(screen.getByText('low')).toBeTruthy();
  });

  it('goals tab loads and shows status badge', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/goals')) return Promise.resolve({ data: GOALS });
      return Promise.resolve({ data: OBSERVATIONS });
    });

    render(<MemoryRouter><ChildDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('Amin Aliyev'));

    const goalsBtn = screen.getByText('Goals');
    fireEvent.click(goalsBtn);
    await waitFor(() => expect(screen.queryByText('Improve vocabulary')).not.toBeNull(), { timeout: 4000 });
    expect(screen.getAllByText('active').length).toBeGreaterThan(0);
  });

  it('shows "No observations" empty state when list is empty', async () => {
    api.get.mockResolvedValue({ data: [] });
    render(<MemoryRouter><ChildDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('No observations recorded'));
    expect(screen.getByText('No observations recorded')).toBeTruthy();
  });

  it('shows "No goals" empty state when goals list is empty', async () => {
    api.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    render(<MemoryRouter><ChildDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('Amin Aliyev'));

    fireEvent.click(screen.getByText('Goals'));
    await waitFor(() => screen.getByText('No goals recorded'));
    expect(screen.getByText('No goals recorded')).toBeTruthy();
  });
});
