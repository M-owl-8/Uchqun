import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const a = await vi.importActual('react-router-dom');
  return { ...a };
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
import ActivityFeed from '../../pages/ActivityFeed';

const ENTRIES = [
  {
    id: 'a-1',
    action: 'approve',
    entity: 'documents',
    occurredAt: new Date().toISOString(),
    actor: { id: 'u-1', firstName: 'Sherzod', lastName: 'Rakhimov', role: 'reception' },
  },
  {
    id: 'a-2',
    action: 'suspend',
    entity: 'users',
    occurredAt: new Date().toISOString(),
    actor: { id: 'u-2', firstName: 'Dilnoza', lastName: 'Tosheva', role: 'admin' },
  },
];

const makeRes = (entries, { total = 2, totalPages = 1, page = 1 } = {}) => ({
  data: { data: { entries, total, page, limit: 20, totalPages } },
});

describe('ActivityFeed (FE-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders paginated audit entries from API response', async () => {
    api.get.mockResolvedValue(makeRes(ENTRIES));
    render(<MemoryRouter><ActivityFeed /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText('Sherzod Rakhimov').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Dilnoza Tosheva').length).toBeGreaterThan(0);
  });

  it('shows actor name and action label', async () => {
    api.get.mockResolvedValue(makeRes(ENTRIES));
    render(<MemoryRouter><ActivityFeed /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText('Hujjat tasdiqlandi').length).toBeGreaterThan(0));
    expect(screen.getAllByText("Ota-ona to'xtatildi").length).toBeGreaterThan(0);
  });

  it('shows "No activity" empty state when entries=[]', async () => {
    api.get.mockResolvedValue(makeRes([], { total: 0, totalPages: 1 }));
    render(<MemoryRouter><ActivityFeed /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText((c) => c.includes('No activity yet'))).toBeTruthy()
    );
  });

  it('filter by action calls API with action query param', async () => {
    api.get.mockResolvedValue(makeRes(ENTRIES));
    render(<MemoryRouter><ActivityFeed /></MemoryRouter>);
    await waitFor(() => screen.getByText('Sherzod Rakhimov'));

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'approve' } });

    await waitFor(() => {
      const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1];
      expect(lastCall[1]?.params?.action).toBe('approve');
    });
  });

  it('pagination controls shown when totalPages > 1', async () => {
    api.get.mockResolvedValue(makeRes(ENTRIES, { total: 40, totalPages: 2 }));
    render(<MemoryRouter><ActivityFeed /></MemoryRouter>);
    await waitFor(() => screen.getByText('Sherzod Rakhimov'));
    expect(screen.getByText('Oldingi')).toBeTruthy();
    expect(screen.getByText('Keyingi')).toBeTruthy();
  });
});
