import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockApi = { get: vi.fn() };
vi.mock('../services/api', () => ({ default: mockApi }));

vi.mock('@shared/components/Skeleton', () => ({
  SkeletonDashboard: () => <div data-testid="skeleton" />,
}));
vi.mock('@shared/components/OfflineBanner', () => ({
  StaleIndicator: () => null,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, opts) => opts?.defaultValue ?? _key,
    i18n: { language: 'uz' },
  }),
}));

function setupMocks({ warningsTotal = 0 } = {}) {
  mockApi.get.mockImplementation(async (url) => {
    if (url === '/government/overview')
      return { data: { data: { schools: 3, students: 50, teachers: 5, parents: 10, averageRating: 3.5, activeWarnings: 0 } } };
    if (url === '/government/schools')
      return { data: { data: { schools: [], total: 0 } } };
    if (url.includes('/admin-registrations'))
      return { data: { data: [], pagination: { total: 0 } } };
    if (url === '/ai-warnings')
      // Backend returns { warnings: [...], total } — warnings has 2 items but total is warningsTotal
      return { data: { success: true, data: { warnings: [{ id: 1 }, { id: 2 }], total: warningsTotal } } };
    return { data: { data: [] } };
  });
}

const Dashboard = (await import('../pages/Dashboard.jsx')).default;

describe('Dashboard — GOV-001: AI warnings count', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends isResolved:false (not resolved:false) to /ai-warnings', async () => {
    setupMocks({ warningsTotal: 0 });
    render(<Dashboard />);
    await waitFor(() => {
      const calls = mockApi.get.mock.calls.filter(([url]) => url === '/ai-warnings');
      expect(calls.length).toBeGreaterThan(0);
      const params = calls[0][1]?.params ?? {};
      // Must send isResolved, not resolved
      expect(params).toHaveProperty('isResolved', false);
      expect(params).not.toHaveProperty('resolved');
    });
  });

  it('displays total from response as warning count (not warnings array length)', async () => {
    // API returns 2 warnings in the array but total = 42
    // Pre-fix: code reads .data?.data?.length which is undefined (data.data is an object, not array),
    //          falls to ?? 0. Badge shows 0, not 42.
    // Post-fix: code reads .data?.data?.total = 42. Badge shows 42.
    setupMocks({ warningsTotal: 42 });
    render(<Dashboard />);
    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
  });
});
