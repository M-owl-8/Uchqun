import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockWarning = vi.fn();

vi.mock('@shared/hooks/useFetch', () => ({
  useFetch: vi.fn(),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key, opts) => opts?.defaultValue ?? _key }),
}));
vi.mock('@shared/components/LoadingSpinner', () => ({ default: () => <span>loading</span> }));
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ warning: mockWarning }),
}));

import { useFetch } from '@shared/hooks/useFetch';
const Schools = (await import('../pages/Schools.jsx')).default;

const MOCK_SCHOOL = { id: 1, name: 'Test School', averageRating: 4.5, ratingsCount: 10, studentsCount: 100 };

describe('Schools — GOV-003/010: limit=999, total badge, export truncation warning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  it('fetches with limit=999 in the URL', () => {
    useFetch.mockReturnValue({ data: { schools: [], total: 0 }, loading: false, error: null });
    render(<Schools />);
    expect(useFetch).toHaveBeenCalledWith(expect.stringContaining('limit=999'));
  });

  it('badge shows schools.length/total when truncated', () => {
    useFetch.mockReturnValue({
      data: { schools: [MOCK_SCHOOL], total: 5 },
      loading: false,
      error: null,
    });
    render(<Schools />);
    expect(screen.getByText('1/5')).toBeInTheDocument();
  });

  it('badge does not show slash notation when list is not truncated', () => {
    useFetch.mockReturnValue({
      data: { schools: [MOCK_SCHOOL, { ...MOCK_SCHOOL, id: 2, name: 'School B' }], total: 2 },
      loading: false,
      error: null,
    });
    render(<Schools />);
    expect(screen.queryByText(/^\d+\/\d+$/)).not.toBeInTheDocument();
  });

  it('shows truncation warning toast on CSV export when list is truncated', () => {
    useFetch.mockReturnValue({
      data: { schools: [MOCK_SCHOOL], total: 5 },
      loading: false,
      error: null,
    });
    // Spy on createElement only for 'a' elements to avoid interfering with React
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return { href: '', download: '', click: vi.fn() };
      return origCreate(tag);
    });

    render(<Schools />);
    const exportBtn = screen.getByRole('button', { name: /CSV/i });
    fireEvent.click(exportBtn);

    expect(mockWarning).toHaveBeenCalledTimes(1);
    expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('1'));
    vi.restoreAllMocks();
  });

  it('does NOT show warning toast when list is complete', () => {
    useFetch.mockReturnValue({
      data: { schools: [MOCK_SCHOOL], total: 1 },
      loading: false,
      error: null,
    });
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return { href: '', download: '', click: vi.fn() };
      return origCreate(tag);
    });

    render(<Schools />);
    const exportBtn = screen.getByRole('button', { name: /CSV/i });
    fireEvent.click(exportBtn);

    expect(mockWarning).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
