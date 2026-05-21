import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockApi = { get: vi.fn() };
vi.mock('../services/api', () => ({ default: mockApi }));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, opts) => {
      let val = opts?.defaultValue ?? _key;
      if (opts?.name) val = val.replace('{{name}}', opts.name);
      return val;
    },
  }),
}));

vi.mock('@shared/components/LoadingSpinner', () => ({
  default: ({ size }) => <div data-testid="spinner" data-size={size} />,
}));

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../hooks/useRegionName', () => ({ useRegionName: vi.fn() }));

const makeResponse = (entries, { total = entries.length, page = 1, totalPages = 1 } = {}) => ({
  data: { data: { entries, total, page, limit: 20, totalPages } },
});

const sampleEntries = [
  {
    id: 'e1',
    action: 'archive',
    entity: 'schools',
    entityId: 'school-uuid-1',
    createdAt: '2026-05-21T10:00:00Z',
    actor: { firstName: 'Ali', lastName: 'Valiyev' },
  },
  {
    id: 'e2',
    action: 'create',
    entity: 'admins',
    entityId: 'admin-uuid-1',
    createdAt: '2026-05-20T09:30:00Z',
    actor: null,
  },
];

import { useRegionName } from '../hooks/useRegionName';
const AuditLog = (await import('../pages/AuditLog.jsx')).default;

describe('AuditLog — scope labeling (E3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue(makeResponse([]));
  });

  it('republic: shows "All regions" scope label', async () => {
    mockUseAuth.mockReturnValue({ isRepublic: true, isRegionAccount: false });
    useRegionName.mockReturnValue(null);
    render(<AuditLog />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument());
    expect(screen.getByTestId('scope-label')).toHaveTextContent('All regions');
  });

  it('region: shows region name in scope label and region-specific empty state', async () => {
    mockUseAuth.mockReturnValue({ isRepublic: false, isRegionAccount: true });
    useRegionName.mockReturnValue('Tashkent');
    render(<AuditLog />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    expect(screen.getByTestId('scope-label')).toHaveTextContent('Tashkent');
    expect(screen.getByText('No audit entries for Tashkent yet')).toBeInTheDocument();
  });
});

describe('AuditLog — S1-F02 audit viewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isRepublic: true, isRegionAccount: false });
    useRegionName.mockReturnValue(null);
    mockApi.get.mockResolvedValue(makeResponse(sampleEntries));
  });

  it('shows loading spinner while fetch is pending', () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    render(<AuditLog />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-table')).not.toBeInTheDocument();
  });

  it('renders table rows after successful fetch', async () => {
    render(<AuditLog />);
    await waitFor(() => expect(screen.getByTestId('audit-table')).toBeInTheDocument());
    expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
    // 'Arxivlash' appears in both the dropdown option and the table badge
    expect(screen.getAllByText('Arxivlash').length).toBeGreaterThan(0);
    expect(screen.getByText('school-uuid-1')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // null actor
  });

  it('shows empty state when no entries returned', async () => {
    mockApi.get.mockResolvedValue(makeResponse([]));
    render(<AuditLog />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    expect(screen.getByText('Yozuvlar topilmadi')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockApi.get.mockRejectedValue({
      response: { data: { error: { detail: 'DB xatosi' } } },
    });
    render(<AuditLog />);
    await waitFor(() => expect(screen.getByTestId('error-state')).toBeInTheDocument());
    expect(screen.getByText('DB xatosi')).toBeInTheDocument();
  });

  it('apply-filters calls api.get with action param', async () => {
    render(<AuditLog />);
    await waitFor(() => screen.getByTestId('audit-table'));

    fireEvent.change(screen.getByTestId('filter-action'), { target: { value: 'archive' } });
    fireEvent.click(screen.getByTestId('apply-filters'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenLastCalledWith(
        expect.stringContaining('action=archive'),
      );
    });
  });

  it('next-page button fetches page 2', async () => {
    mockApi.get.mockResolvedValueOnce(makeResponse(sampleEntries, { total: 40, totalPages: 2, page: 1 }));
    render(<AuditLog />);
    await waitFor(() => screen.getByTestId('next-page'));

    mockApi.get.mockResolvedValueOnce(makeResponse(sampleEntries, { total: 40, totalPages: 2, page: 2 }));
    fireEvent.click(screen.getByTestId('next-page'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenLastCalledWith(
        expect.stringContaining('page=2'),
      );
    });
    expect(screen.getByTestId('page-indicator').textContent).toBe('2 / 2');
  });

  it('action filter select renders all action options', async () => {
    render(<AuditLog />);
    const select = screen.getByTestId('filter-action');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toContain('archive');
    expect(options).toContain('reactivate');
    expect(options).toContain('approve_registration');
    expect(options).toContain('delete');
  });
});
