import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const mockApi = { get: vi.fn() };
vi.mock('../services/api', () => ({ default: mockApi }));

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

import { useRegionName } from '../hooks/useRegionName';

const makeRepublic = () => mockUseAuth.mockReturnValue({ isRepublic: true, isRegionAccount: false });
const makeRegion = () => mockUseAuth.mockReturnValue({ isRepublic: false, isRegionAccount: true });

// ─── Students ───────────────────────────────────────────────────────────────

const Students = (await import('../pages/Students.jsx')).default;

describe('Students directory page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRegionName.mockReturnValue(null);
  });

  it('shows loading spinner on first fetch', () => {
    makeRepublic();
    mockApi.get.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<Students />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('republic: shows "All regions" scope label', async () => {
    makeRepublic();
    mockApi.get.mockResolvedValue({ data: { data: { students: [], total: 0 } } });
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument());
    expect(screen.getByTestId('scope-label')).toHaveTextContent('All regions');
  });

  it('region: shows region name in scope label', async () => {
    makeRegion();
    useRegionName.mockReturnValue('Andijan');
    mockApi.get.mockResolvedValue({ data: { data: { students: [], total: 0 } } });
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument());
    expect(screen.getByTestId('scope-label')).toHaveTextContent('Andijan');
  });

  it('region: empty state shows region-specific message', async () => {
    makeRegion();
    useRegionName.mockReturnValue('Andijan');
    mockApi.get.mockResolvedValue({ data: { data: { students: [], total: 0 } } });
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());
    expect(screen.getByText('No students in Andijan yet')).toBeInTheDocument();
  });

  it('renders student rows', async () => {
    makeRepublic();
    mockApi.get.mockResolvedValue({
      data: {
        data: {
          total: 1,
          students: [{ id: 's1', firstName: 'Ali', lastName: 'Valiyev', dateOfBirth: '2010-01-01', schoolName: 'School A', parentName: 'Vali Valiyev' }],
        },
      },
    });
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.getByText('Ali Valiyev')).toBeInTheDocument());
    expect(screen.getByText('School A')).toBeInTheDocument();
  });
});

// ─── Teachers ───────────────────────────────────────────────────────────────

const Teachers = (await import('../pages/Teachers.jsx')).default;

describe('Teachers directory page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRegionName.mockReturnValue(null);
  });

  it('republic: shows "All regions" scope label', async () => {
    makeRepublic();
    mockApi.get.mockResolvedValue({ data: { data: { teachers: [], total: 0 } } });
    renderWithRouter(<Teachers />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument());
    expect(screen.getByTestId('scope-label')).toHaveTextContent('All regions');
  });

  it('region: shows region name and region-specific empty state', async () => {
    makeRegion();
    useRegionName.mockReturnValue('Fergana');
    mockApi.get.mockResolvedValue({ data: { data: { teachers: [], total: 0 } } });
    renderWithRouter(<Teachers />);
    await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());
    expect(screen.getByTestId('scope-label')).toHaveTextContent('Fergana');
    expect(screen.getByText('No teachers in Fergana yet')).toBeInTheDocument();
  });

  it('renders teacher rows', async () => {
    makeRepublic();
    mockApi.get.mockResolvedValue({
      data: {
        data: {
          total: 1,
          teachers: [{ id: 't1', firstName: 'Aziz', lastName: 'Karimov', email: 'aziz@school.uz', phone: '+998901234567' }],
        },
      },
    });
    renderWithRouter(<Teachers />);
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeInTheDocument());
    expect(screen.getByText('aziz@school.uz')).toBeInTheDocument();
  });
});

// ─── Parents ────────────────────────────────────────────────────────────────

const Parents = (await import('../pages/Parents.jsx')).default;

describe('Parents directory page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRegionName.mockReturnValue(null);
  });

  it('republic: shows "All regions" scope label', async () => {
    makeRepublic();
    mockApi.get.mockResolvedValue({ data: { data: { parents: [], total: 0 } } });
    renderWithRouter(<Parents />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument());
    expect(screen.getByTestId('scope-label')).toHaveTextContent('All regions');
  });

  it('region: shows region name and region-specific empty state', async () => {
    makeRegion();
    useRegionName.mockReturnValue('Bukhara');
    mockApi.get.mockResolvedValue({ data: { data: { parents: [], total: 0 } } });
    renderWithRouter(<Parents />);
    await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());
    expect(screen.getByTestId('scope-label')).toHaveTextContent('Bukhara');
    expect(screen.getByText('No parents in Bukhara yet')).toBeInTheDocument();
  });

  it('renders parent rows', async () => {
    makeRepublic();
    mockApi.get.mockResolvedValue({
      data: {
        data: {
          total: 1,
          parents: [{ id: 'p1', firstName: 'Sara', lastName: 'Toshmatova', email: 'sara@mail.uz', phone: '+998901234567' }],
        },
      },
    });
    renderWithRouter(<Parents />);
    await waitFor(() => expect(screen.getByText('Sara Toshmatova')).toBeInTheDocument());
    expect(screen.getByText('sara@mail.uz')).toBeInTheDocument();
  });
});
